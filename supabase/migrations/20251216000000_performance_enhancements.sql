-- ============================================================================
-- PERFORMANCE MANAGEMENT - Additional Functions
-- Run this in Supabase SQL Editor to add quarterly reports
-- ============================================================================

-- Function to generate quarterly performance report
CREATE OR REPLACE FUNCTION public.generate_quarterly_performance(
    p_year int DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
    p_quarter int DEFAULT CEIL(EXTRACT(MONTH FROM CURRENT_DATE)::float / 3)::int
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
    
    -- Calculate quarter dates
    v_period_start := make_date(p_year, (p_quarter - 1) * 3 + 1, 1);
    v_period_end := (v_period_start + INTERVAL '3 months' - INTERVAL '1 day')::date;
    
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
        'period_type', 'quarterly',
        'quarter', p_quarter,
        'period_start', v_period_start,
        'period_end', v_period_end,
        'employees_processed', v_count
    );
END;
$$;

-- Function to update performance metrics with manual inputs (quality, attendance)
CREATE OR REPLACE FUNCTION public.update_performance_metrics(
    p_metric_id uuid,
    p_quality_rating float DEFAULT NULL,
    p_attendance_rate float DEFAULT NULL,
    p_manager_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_record performance_metrics%ROWTYPE;
    v_new_overall_score float;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Get current record
    SELECT * INTO v_current_record FROM performance_metrics WHERE id = p_metric_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance metric not found';
    END IF;
    
    -- Calculate new overall score including quality and attendance
    -- Weight: Task completion (40%) + On-time (30%) + Quality (15%) + Attendance (15%)
    v_new_overall_score := 
        (COALESCE(v_current_record.completion_rate, 0) * 0.4) +
        (COALESCE(v_current_record.on_time_rate, 0) * 0.3) +
        (COALESCE(COALESCE(p_quality_rating, v_current_record.quality_rating), 3) * 20 * 0.15) + -- Convert 1-5 to 0-100
        (COALESCE(COALESCE(p_attendance_rate, v_current_record.attendance_rate), 100) * 0.15);
    
    -- Update the record
    UPDATE performance_metrics
    SET 
        quality_rating = COALESCE(p_quality_rating, quality_rating),
        attendance_rate = COALESCE(p_attendance_rate, attendance_rate),
        manager_notes = COALESCE(p_manager_notes, manager_notes),
        overall_score = ROUND(v_new_overall_score::numeric, 2),
        -- Recalculate incentive based on new score
        incentive_percentage = CASE
            WHEN v_new_overall_score >= 95 THEN 20
            WHEN v_new_overall_score >= 85 THEN 15
            WHEN v_new_overall_score >= 75 THEN 10
            WHEN v_new_overall_score >= 60 THEN 5
            ELSE 0
        END,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_metric_id;
END;
$$;

-- Success message
SELECT 'Quarterly performance and metric update functions created!' as message;
