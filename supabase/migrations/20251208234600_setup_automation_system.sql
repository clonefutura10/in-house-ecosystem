-- Migration: Setup Automation System with pg_cron
-- Creates scalable reminder system with generic event checking and syncs cron jobs with automation config

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- SCHEMA UPDATES: Add cron management fields to automation_configs
-- ============================================================================

ALTER TABLE public.automation_configs 
ADD COLUMN IF NOT EXISTS cron_job_name text,
ADD COLUMN IF NOT EXISTS cron_command text;

-- Add unique constraint to reminder_templates for safely seeding
ALTER TABLE public.reminder_templates DROP CONSTRAINT IF EXISTS reminder_templates_name_unique;
ALTER TABLE public.reminder_templates ADD CONSTRAINT reminder_templates_name_unique UNIQUE (name);

-- ============================================================================
-- CORE FUNCTIONS: Generic, scalable reminder processing
-- ============================================================================

-- Helper function to replace template variables
CREATE OR REPLACE FUNCTION public.replace_template_variables(p_template text, p_employee public.profiles)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result text := COALESCE(p_template, '');
BEGIN
  -- Replace common variables
  v_result := replace(v_result, '{{name}}', COALESCE(p_employee.full_name, ''));
  v_result := replace(v_result, '{{email}}', COALESCE(p_employee.email, ''));
  v_result := replace(v_result, '{{department}}', COALESCE(p_employee.department, ''));
  v_result := replace(v_result, '{{job_title}}', COALESCE(p_employee.job_title, ''));
  v_result := replace(v_result, '{{company}}', 'Ecosystem'); 
  
  RETURN v_result;
END;
$$;

-- Generic function to process reminders by type
CREATE OR REPLACE FUNCTION public.process_reminders_by_type(p_reminder_type public.reminder_type)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config record;
  v_template record;
  v_employee record;
  v_count integer := 0;
  v_subject text;
  v_body text;
BEGIN
  -- Get active config for this reminder type
  SELECT * INTO v_config 
  FROM public.automation_configs 
  WHERE reminder_type = p_reminder_type AND is_active = true
  LIMIT 1;
  
  IF v_config IS NULL THEN 
    RETURN 0; 
  END IF;
  
  -- Get template
  SELECT * INTO v_template 
  FROM public.reminder_templates 
  WHERE id = v_config.template_id;
  
  IF v_template IS NULL THEN 
    RETURN 0; 
  END IF;
  
  -- Process based on reminder type
  CASE p_reminder_type
    WHEN 'birthday' THEN
      FOR v_employee IN 
        SELECT * FROM public.profiles 
        WHERE date_of_birth IS NOT NULL 
          AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
          AND status = 'active'
      LOOP
        v_subject := replace_template_variables(v_template.subject_template, v_employee);
        v_body := replace_template_variables(v_template.body_template, v_employee);
        
        INSERT INTO public.notifications (user_id, title, message, channel, status, metadata)
        VALUES (v_employee.id, v_subject, v_body, 'email', 'pending', 
                jsonb_build_object('type', 'birthday', 'config_id', v_config.id));
        v_count := v_count + 1;
      END LOOP;
      
    WHEN 'anniversary' THEN
      FOR v_employee IN 
        SELECT * FROM public.profiles 
        WHERE work_anniversary IS NOT NULL 
          AND EXTRACT(MONTH FROM work_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM work_anniversary) = EXTRACT(DAY FROM CURRENT_DATE)
          AND status = 'active'
      LOOP
        v_subject := replace_template_variables(v_template.subject_template, v_employee);
        v_body := replace_template_variables(v_template.body_template, v_employee);
        
        INSERT INTO public.notifications (user_id, title, message, channel, status, metadata)
        VALUES (v_employee.id, v_subject, v_body, 'email', 'pending',
                jsonb_build_object('type', 'anniversary', 'config_id', v_config.id));
        v_count := v_count + 1;
      END LOOP;
      
    WHEN 'task_deadline' THEN
      FOR v_employee IN 
        SELECT DISTINCT p.* 
        FROM public.profiles p
        JOIN public.tasks t ON t.assigned_to = p.id
        WHERE t.due_date::date = CURRENT_DATE
          AND t.status NOT IN ('done')
          AND t.is_archived = false
          AND p.status = 'active'
      LOOP
        v_subject := replace_template_variables(v_template.subject_template, v_employee);
        v_body := replace_template_variables(v_template.body_template, v_employee);
        
        INSERT INTO public.notifications (user_id, title, message, channel, status, metadata)
        VALUES (v_employee.id, v_subject, v_body, 'email', 'pending',
                jsonb_build_object('type', 'task_deadline', 'config_id', v_config.id));
        v_count := v_count + 1;
      END LOOP;
    ELSE
      NULL;
  END CASE;
  
  RETURN v_count;
END;
$$;

-- ============================================================================
-- CONVENIENCE FUNCTIONS: Called by cron jobs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_birthday_reminders()
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT public.process_reminders_by_type('birthday'::public.reminder_type);
$$;

CREATE OR REPLACE FUNCTION public.check_anniversary_reminders()
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT public.process_reminders_by_type('anniversary'::public.reminder_type);
$$;

CREATE OR REPLACE FUNCTION public.check_task_deadline_reminders()
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT public.process_reminders_by_type('task_deadline'::public.reminder_type);
$$;

-- ============================================================================
-- ADMIN RPC FUNCTIONS: Manage automations
-- ============================================================================

-- Toggle automation on/off AND sync with pg_cron
CREATE OR REPLACE FUNCTION public.toggle_automation(p_automation_id uuid, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_name text;
  v_schedule text;
  v_command text;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Update config and return cron details
  UPDATE public.automation_configs 
  SET is_active = p_is_active, updated_at = now() 
  WHERE id = p_automation_id
  RETURNING cron_job_name, trigger_cron, cron_command INTO v_job_name, v_schedule, v_command;
  
  -- Sync with pg_cron
  IF v_job_name IS NOT NULL AND v_command IS NOT NULL THEN
    IF p_is_active THEN
       -- Schedule/Update job
       PERFORM cron.schedule(v_job_name, v_schedule, v_command);
    ELSE
       -- Remove job
       PERFORM cron.unschedule(v_job_name);
    END IF;
  END IF;
END;
$$;

-- Update template content
CREATE OR REPLACE FUNCTION public.update_reminder_template(
  p_template_id uuid,
  p_subject text,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE public.reminder_templates 
  SET subject_template = p_subject, body_template = p_body
  WHERE id = p_template_id;
END;
$$;

-- Create new automation config
CREATE OR REPLACE FUNCTION public.create_automation(
  p_name text,
  p_reminder_type public.reminder_type,
  p_trigger_cron text,
  p_template_id uuid,
  p_cron_job_name text DEFAULT NULL,
  p_cron_command text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_job_name text;
  v_command text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Determine job name and command if not provided
  v_job_name := COALESCE(p_cron_job_name, 'job_' || replace(lower(p_name), ' ', '_'));
  v_command := COALESCE(p_cron_command, 
       CASE p_reminder_type
         WHEN 'birthday' THEN 'SELECT public.check_birthday_reminders()'
         WHEN 'anniversary' THEN 'SELECT public.check_anniversary_reminders()'
         WHEN 'task_deadline' THEN 'SELECT public.check_task_deadline_reminders()'
         ELSE 'SELECT 1' -- Placeholder
       END
  );

  INSERT INTO public.automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
  VALUES (p_name, p_reminder_type, p_trigger_cron, p_template_id, true, v_job_name, v_command)
  RETURNING id INTO v_id;
  
  -- Create the cron job immediately since default is_active = true
  PERFORM cron.schedule(v_job_name, p_trigger_cron, v_command);
  
  RETURN v_id;
END;
$$;

-- Create new template
CREATE OR REPLACE FUNCTION public.create_reminder_template(
  p_name text,
  p_subject text,
  p_body text,
  p_channels public.notification_channel[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  INSERT INTO public.reminder_templates (name, subject_template, body_template, channel, created_by)
  VALUES (p_name, p_subject, p_body, p_channels, auth.uid())
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- SEED DEFAULT TEMPLATES & AUTOMATION CONFIGS
-- ============================================================================

-- Templates
INSERT INTO public.reminder_templates (name, subject_template, body_template, channel) VALUES
  ('Birthday Wishes', 'Happy Birthday, {{name}}! 🎂', 
   E'Hi {{name}},\n\nWishing you a fantastic birthday from all of us at {{company}}!\n\nBest,\nThe Team', 
   '{email}'),
  ('Work Anniversary', 'Happy Work Anniversary, {{name}}! 🎉', 
   E'Hi {{name}},\n\nCongratulations on another year with {{company}}! We appreciate your hard work and dedication.\n\nBest,\nThe Team', 
   '{email}'),
  ('Task Deadline Reminder', 'Tasks Due Today - {{name}}', 
   E'Hi {{name}},\n\nThis is a reminder that you have tasks due today. Please check your task list.\n\nBest,\nThe Team', 
   '{email}')
ON CONFLICT (name) DO NOTHING;

-- Automation Configs (with cron info)
-- Birthday
INSERT INTO public.automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 'Birthday Wishes', 'birthday', '0 9 * * *', id, true, 'birthday_check', 'SELECT public.check_birthday_reminders()'
FROM public.reminder_templates WHERE name = 'Birthday Wishes'
ON CONFLICT (name) 
DO UPDATE SET 
  cron_job_name = EXCLUDED.cron_job_name,
  cron_command = EXCLUDED.cron_command;

-- Anniversary
INSERT INTO public.automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 'Work Anniversary', 'anniversary', '0 9 * * *', id, true, 'anniversary_check', 'SELECT public.check_anniversary_reminders()'
FROM public.reminder_templates WHERE name = 'Work Anniversary'
ON CONFLICT (name) 
DO UPDATE SET 
  cron_job_name = EXCLUDED.cron_job_name,
  cron_command = EXCLUDED.cron_command;

-- Task Deadline
INSERT INTO public.automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 'Task Deadline Reminder', 'task_deadline', '0 8 * * *', id, true, 'task_deadline_check', 'SELECT public.check_task_deadline_reminders()'
FROM public.reminder_templates WHERE name = 'Task Deadline Reminder'
ON CONFLICT (name) 
DO UPDATE SET 
  cron_job_name = EXCLUDED.cron_job_name,
  cron_command = EXCLUDED.cron_command;

-- ============================================================================
-- INITIALIZE CRON JOBS
-- ============================================================================

-- We use separate calls to ensure they are created if missing.
-- Note: cron.schedule updates the job if it already exists with the same name.

SELECT cron.schedule('birthday_check', '0 9 * * *', 'SELECT public.check_birthday_reminders()');
SELECT cron.schedule('anniversary_check', '0 9 * * *', 'SELECT public.check_anniversary_reminders()');
SELECT cron.schedule('task_deadline_check', '0 8 * * *', 'SELECT public.check_task_deadline_reminders()');
