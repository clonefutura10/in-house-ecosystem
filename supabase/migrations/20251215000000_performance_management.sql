-- ============================================================================
-- PERFORMANCE MANAGEMENT SYSTEM
-- Migration: Create performance tables and auto-calculation functions
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Performance Types
-- ============================================================================

-- Create appraisal period enum if not exists
DO $$ BEGIN
    CREATE TYPE appraisal_period AS ENUM ('monthly', 'quarterly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Create Performance Metrics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    
    -- Task-based metrics (auto-calculated)
    tasks_assigned int DEFAULT 0,
    tasks_completed int DEFAULT 0,
    tasks_on_time int DEFAULT 0,
    tasks_overdue int DEFAULT 0,
    completion_rate float DEFAULT 0, -- Percentage (0-100)
    on_time_rate float DEFAULT 0, -- Percentage (0-100)
    
    -- Manual metrics
    attendance_days int DEFAULT 0,
    working_days int DEFAULT 22, -- Standard working days per month
    attendance_rate float DEFAULT 100, -- Percentage
    quality_rating float DEFAULT 3, -- 1-5 scale
    
    -- Calculated overall score
    overall_score float DEFAULT 0, -- Weighted average (0-100)
    
    -- Manager feedback
    manager_notes text,
    reviewed_by uuid REFERENCES public.profiles(id),
    reviewed_at timestamptz,
    
    -- Incentive calculation
    incentive_percentage float DEFAULT 0, -- Based on performance tier
    bonus_amount decimal(10,2) DEFAULT 0,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure unique period per user
    UNIQUE(user_id, period_start, period_end)
);

-- ============================================================================
-- STEP 3: Create Appraisals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.appraisals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reviewer_id uuid REFERENCES public.profiles(id) NOT NULL,
    period appraisal_period NOT NULL,
    period_year int NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    period_number int NOT NULL DEFAULT 1, -- 1-12 for monthly, 1-4 for quarterly, 1 for yearly
    review_date date DEFAULT CURRENT_DATE,
    
    -- Scores (1-5 scale)
    productivity_score float DEFAULT 3,
    quality_score float DEFAULT 3,
    teamwork_score float DEFAULT 3,
    communication_score float DEFAULT 3,
    initiative_score float DEFAULT 3,
    
    -- Calculated overall
    overall_score float DEFAULT 3,
    
    -- Feedback
    strengths text,
    areas_for_improvement text,
    goals_for_next_period text,
    manager_comments text,
    employee_comments text,
    
    -- Status
    status text DEFAULT 'draft', -- draft, pending_review, published
    is_published boolean DEFAULT false,
    published_at timestamptz,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(user_id, period, period_year, period_number)
);

-- ============================================================================
-- STEP 4: Create Performance Goals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.performance_goals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    target_value float,
    current_value float DEFAULT 0,
    unit text, -- 'tasks', 'percentage', 'hours', etc.
    due_date date,
    status text DEFAULT 'in_progress', -- in_progress, completed, missed
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 5: Enable RLS
-- ============================================================================

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

-- Performance Metrics Policies
DROP POLICY IF EXISTS "Admins can do everything on performance_metrics" ON public.performance_metrics;
CREATE POLICY "Admins can do everything on performance_metrics" ON public.performance_metrics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Employees can view own performance_metrics" ON public.performance_metrics;
CREATE POLICY "Employees can view own performance_metrics" ON public.performance_metrics
    FOR SELECT USING (user_id = auth.uid());

-- Appraisals Policies
DROP POLICY IF EXISTS "Admins can do everything on appraisals" ON public.appraisals;
CREATE POLICY "Admins can do everything on appraisals" ON public.appraisals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Employees can view published appraisals" ON public.appraisals;
CREATE POLICY "Employees can view published appraisals" ON public.appraisals
    FOR SELECT USING (user_id = auth.uid() AND is_published = true);

-- Performance Goals Policies
DROP POLICY IF EXISTS "Admins can do everything on performance_goals" ON public.performance_goals;
CREATE POLICY "Admins can do everything on performance_goals" ON public.performance_goals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Employees can view own goals" ON public.performance_goals;
CREATE POLICY "Employees can view own goals" ON public.performance_goals
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- STEP 6: Function to Calculate Performance Metrics from Tasks
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_performance_metrics(
    p_user_id uuid,
    p_period_start date,
    p_period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tasks_assigned int;
    v_tasks_completed int;
    v_tasks_on_time int;
    v_tasks_overdue int;
    v_completion_rate float;
    v_on_time_rate float;
    v_overall_score float;
    v_incentive_percentage float;
BEGIN
    -- Count tasks assigned in the period
    SELECT COUNT(*) INTO v_tasks_assigned
    FROM tasks
    WHERE assigned_to = p_user_id
      AND created_at::date >= p_period_start
      AND created_at::date <= p_period_end;
    
    -- Count tasks completed in the period
    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks
    WHERE assigned_to = p_user_id
      AND status = 'done'
      AND updated_at::date >= p_period_start
      AND updated_at::date <= p_period_end;
    
    -- Count tasks completed on time
    SELECT COUNT(*) INTO v_tasks_on_time
    FROM tasks
    WHERE assigned_to = p_user_id
      AND status = 'done'
      AND updated_at::date >= p_period_start
      AND updated_at::date <= p_period_end
      AND (due_date IS NULL OR updated_at::date <= due_date::date);
    
    -- Count overdue tasks
    SELECT COUNT(*) INTO v_tasks_overdue
    FROM tasks
    WHERE assigned_to = p_user_id
      AND status != 'done'
      AND due_date IS NOT NULL
      AND due_date::date < CURRENT_DATE
      AND is_archived = false;
    
    -- Calculate rates
    v_completion_rate := CASE 
        WHEN v_tasks_assigned > 0 THEN (v_tasks_completed::float / v_tasks_assigned::float) * 100
        ELSE 0 
    END;
    
    v_on_time_rate := CASE 
        WHEN v_tasks_completed > 0 THEN (v_tasks_on_time::float / v_tasks_completed::float) * 100
        ELSE 0 
    END;
    
    -- Calculate overall score (weighted average)
    -- 60% completion rate + 40% on-time rate
    v_overall_score := (v_completion_rate * 0.6) + (v_on_time_rate * 0.4);
    
    -- Calculate incentive tier
    v_incentive_percentage := CASE
        WHEN v_overall_score >= 95 THEN 20  -- Exceptional
        WHEN v_overall_score >= 85 THEN 15  -- Excellent
        WHEN v_overall_score >= 75 THEN 10  -- Good
        WHEN v_overall_score >= 60 THEN 5   -- Satisfactory
        ELSE 0                               -- Needs Improvement
    END;
    
    RETURN jsonb_build_object(
        'tasks_assigned', v_tasks_assigned,
        'tasks_completed', v_tasks_completed,
        'tasks_on_time', v_tasks_on_time,
        'tasks_overdue', v_tasks_overdue,
        'completion_rate', ROUND(v_completion_rate::numeric, 2),
        'on_time_rate', ROUND(v_on_time_rate::numeric, 2),
        'overall_score', ROUND(v_overall_score::numeric, 2),
        'incentive_percentage', v_incentive_percentage
    );
END;
$$;

-- ============================================================================
-- STEP 7: Function to Generate Monthly Performance Report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_monthly_performance(
    p_year int DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
    p_month int DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_period_start date;
    v_period_end date;
    v_employee record;
    v_metrics jsonb;
    v_count int := 0;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Calculate period dates
    v_period_start := make_date(p_year, p_month, 1);
    v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;
    
    -- Generate metrics for each active employee
    FOR v_employee IN 
        SELECT id, full_name FROM profiles 
        WHERE role = 'employee' AND status = 'active'
    LOOP
        -- Calculate metrics
        v_metrics := calculate_performance_metrics(v_employee.id, v_period_start, v_period_end);
        
        -- Insert or update performance record
        INSERT INTO performance_metrics (
            user_id, period_start, period_end,
            tasks_assigned, tasks_completed, tasks_on_time, tasks_overdue,
            completion_rate, on_time_rate, overall_score, incentive_percentage
        )
        VALUES (
            v_employee.id, v_period_start, v_period_end,
            (v_metrics->>'tasks_assigned')::int,
            (v_metrics->>'tasks_completed')::int,
            (v_metrics->>'tasks_on_time')::int,
            (v_metrics->>'tasks_overdue')::int,
            (v_metrics->>'completion_rate')::float,
            (v_metrics->>'on_time_rate')::float,
            (v_metrics->>'overall_score')::float,
            (v_metrics->>'incentive_percentage')::float
        )
        ON CONFLICT (user_id, period_start, period_end)
        DO UPDATE SET
            tasks_assigned = EXCLUDED.tasks_assigned,
            tasks_completed = EXCLUDED.tasks_completed,
            tasks_on_time = EXCLUDED.tasks_on_time,
            tasks_overdue = EXCLUDED.tasks_overdue,
            completion_rate = EXCLUDED.completion_rate,
            on_time_rate = EXCLUDED.on_time_rate,
            overall_score = EXCLUDED.overall_score,
            incentive_percentage = EXCLUDED.incentive_percentage,
            updated_at = now();
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'period_start', v_period_start,
        'period_end', v_period_end,
        'employees_processed', v_count
    );
END;
$$;

-- ============================================================================
-- STEP 8: Function to Get Performance Summary for Dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_performance_summary(
    p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_is_admin boolean;
    v_current_month_start date;
    v_current_month_end date;
    v_last_month_start date;
    v_last_month_end date;
    v_current_metrics jsonb;
    v_last_metrics jsonb;
    v_result jsonb;
BEGIN
    -- Check if admin
    SELECT role = 'admin' INTO v_is_admin FROM profiles WHERE id = auth.uid();
    
    -- Determine user ID
    IF p_user_id IS NOT NULL AND v_is_admin THEN
        v_user_id := p_user_id;
    ELSE
        v_user_id := auth.uid();
    END IF;
    
    -- Calculate date ranges
    v_current_month_start := date_trunc('month', CURRENT_DATE)::date;
    v_current_month_end := (v_current_month_start + INTERVAL '1 month' - INTERVAL '1 day')::date;
    v_last_month_start := (v_current_month_start - INTERVAL '1 month')::date;
    v_last_month_end := (v_current_month_start - INTERVAL '1 day')::date;
    
    -- Get current month metrics
    v_current_metrics := calculate_performance_metrics(v_user_id, v_current_month_start, v_current_month_end);
    
    -- Get last month metrics from stored data
    SELECT jsonb_build_object(
        'overall_score', overall_score,
        'completion_rate', completion_rate,
        'on_time_rate', on_time_rate
    ) INTO v_last_metrics
    FROM performance_metrics
    WHERE user_id = v_user_id
      AND period_start = v_last_month_start
      AND period_end = v_last_month_end;
    
    -- Build result
    v_result := jsonb_build_object(
        'user_id', v_user_id,
        'current_month', jsonb_build_object(
            'period_start', v_current_month_start,
            'period_end', v_current_month_end,
            'metrics', v_current_metrics
        ),
        'last_month', v_last_metrics,
        'trend', CASE 
            WHEN v_last_metrics IS NULL THEN 'new'
            WHEN (v_current_metrics->>'overall_score')::float > COALESCE((v_last_metrics->>'overall_score')::float, 0) THEN 'up'
            WHEN (v_current_metrics->>'overall_score')::float < COALESCE((v_last_metrics->>'overall_score')::float, 0) THEN 'down'
            ELSE 'stable'
        END
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- STEP 9: Function to Create/Update Appraisal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_appraisal(
    p_user_id uuid,
    p_period appraisal_period,
    p_period_year int,
    p_period_number int,
    p_productivity_score float DEFAULT 3,
    p_quality_score float DEFAULT 3,
    p_teamwork_score float DEFAULT 3,
    p_communication_score float DEFAULT 3,
    p_initiative_score float DEFAULT 3,
    p_strengths text DEFAULT NULL,
    p_areas_for_improvement text DEFAULT NULL,
    p_goals text DEFAULT NULL,
    p_comments text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appraisal_id uuid;
    v_overall_score float;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Calculate overall score
    v_overall_score := (p_productivity_score + p_quality_score + p_teamwork_score + p_communication_score + p_initiative_score) / 5;
    
    -- Insert or update
    INSERT INTO appraisals (
        user_id, reviewer_id, period, period_year, period_number,
        productivity_score, quality_score, teamwork_score, communication_score, initiative_score,
        overall_score, strengths, areas_for_improvement, goals_for_next_period, manager_comments
    )
    VALUES (
        p_user_id, auth.uid(), p_period, p_period_year, p_period_number,
        p_productivity_score, p_quality_score, p_teamwork_score, p_communication_score, p_initiative_score,
        v_overall_score, p_strengths, p_areas_for_improvement, p_goals, p_comments
    )
    ON CONFLICT (user_id, period, period_year, period_number)
    DO UPDATE SET
        productivity_score = EXCLUDED.productivity_score,
        quality_score = EXCLUDED.quality_score,
        teamwork_score = EXCLUDED.teamwork_score,
        communication_score = EXCLUDED.communication_score,
        initiative_score = EXCLUDED.initiative_score,
        overall_score = EXCLUDED.overall_score,
        strengths = EXCLUDED.strengths,
        areas_for_improvement = EXCLUDED.areas_for_improvement,
        goals_for_next_period = EXCLUDED.goals_for_next_period,
        manager_comments = EXCLUDED.manager_comments,
        updated_at = now()
    RETURNING id INTO v_appraisal_id;
    
    RETURN v_appraisal_id;
END;
$$;

-- ============================================================================
-- STEP 10: Function to Publish Appraisal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.publish_appraisal(p_appraisal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    UPDATE appraisals
    SET is_published = true, status = 'published', published_at = now()
    WHERE id = p_appraisal_id;
END;
$$;

-- ============================================================================
-- STEP 11: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_period 
ON performance_metrics(user_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_appraisals_user_period 
ON appraisals(user_id, period, period_year);

CREATE INDEX IF NOT EXISTS idx_performance_goals_user 
ON performance_goals(user_id, status);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
