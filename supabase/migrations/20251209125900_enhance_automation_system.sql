-- Migration: Enhance Automation System
-- Adds cron schedule updating, better variable handling, and edge function integration

-- ============================================================================
-- EXTENSIONS: Enable required extensions
-- ============================================================================

-- Enable pg_net for HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Enable supabase_vault for secure secret storage
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ============================================================================
-- SCHEMA UPDATES: Add template variable metadata
-- ============================================================================

-- Add required_variables column to track which variables a template needs
ALTER TABLE public.reminder_templates 
ADD COLUMN IF NOT EXISTS required_variables text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description text;

-- Update existing templates with their required variables
UPDATE public.reminder_templates SET required_variables = ARRAY['name', 'company'] WHERE name = 'Birthday Wishes';
UPDATE public.reminder_templates SET required_variables = ARRAY['name', 'company'] WHERE name = 'Work Anniversary';
UPDATE public.reminder_templates SET required_variables = ARRAY['name'] WHERE name = 'Task Deadline Reminder';

-- ============================================================================
-- FUNCTION: Overloaded replace_template_variables for use with records
-- ============================================================================

-- This version accepts individual text parameters instead of a profiles row
-- Needed because PL/pgSQL FOR loops create 'record' type, not 'profiles' type
CREATE OR REPLACE FUNCTION public.replace_template_variables_text(
  p_template text, 
  p_full_name text,
  p_email text,
  p_department text,
  p_job_title text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result text := COALESCE(p_template, '');
BEGIN
  -- Replace common variables
  v_result := replace(v_result, '{{name}}', COALESCE(p_full_name, ''));
  v_result := replace(v_result, '{{email}}', COALESCE(p_email, ''));
  v_result := replace(v_result, '{{department}}', COALESCE(p_department, ''));
  v_result := replace(v_result, '{{job_title}}', COALESCE(p_job_title, ''));
  v_result := replace(v_result, '{{company}}', 'Ecosystem'); 
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC: Update automation schedule
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_automation_schedule(
  p_automation_id uuid,
  p_trigger_cron text,
  p_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_job_name text;
  v_new_job_name text;
  v_command text;
  v_is_active boolean;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get current job details
  SELECT cron_job_name, cron_command, is_active INTO v_old_job_name, v_command, v_is_active
  FROM public.automation_configs 
  WHERE id = p_automation_id;
  
  IF v_old_job_name IS NULL THEN
    RAISE EXCEPTION 'Automation config not found';
  END IF;
  
  -- Determine new job name if name is being updated
  IF p_name IS NOT NULL THEN
    v_new_job_name := 'job_' || replace(lower(p_name), ' ', '_');
  ELSE
    v_new_job_name := v_old_job_name;
  END IF;
  
  -- Update the config
  UPDATE public.automation_configs 
  SET 
    trigger_cron = p_trigger_cron,
    name = COALESCE(p_name, name),
    cron_job_name = v_new_job_name,
    updated_at = now()
  WHERE id = p_automation_id;
  
  -- If job name changed, unschedule old job
  IF v_old_job_name != v_new_job_name THEN
    PERFORM cron.unschedule(v_old_job_name);
  END IF;
  
  -- Reschedule with new timing (only if active)
  IF v_is_active THEN
    PERFORM cron.schedule(v_new_job_name, p_trigger_cron, v_command);
  END IF;
END;
$$;

-- ============================================================================
-- RPC: Delete automation config
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_automation(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_name text;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get job name before deletion
  SELECT cron_job_name INTO v_job_name
  FROM public.automation_configs 
  WHERE id = p_automation_id;
  
  -- Unschedule cron job if exists
  IF v_job_name IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_name);
  END IF;
  
  -- Delete the config
  DELETE FROM public.automation_configs WHERE id = p_automation_id;
END;
$$;

-- ============================================================================
-- ENHANCED REMINDER PROCESSING: Only processes when there's data
-- ============================================================================

-- Enhanced Birthday Processing - Returns data for edge function
CREATE OR REPLACE FUNCTION public.process_birthday_reminders_with_edge()
RETURNS jsonb
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
  v_notifications jsonb := '[]'::jsonb;
BEGIN
  -- Get active config for birthday
  SELECT * INTO v_config 
  FROM public.automation_configs 
  WHERE reminder_type = 'birthday' AND is_active = true
  LIMIT 1;
  
  IF v_config IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No active config');
  END IF;
  
  -- Get template
  SELECT * INTO v_template 
  FROM public.reminder_templates 
  WHERE id = v_config.template_id;
  
  IF v_template IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No template found');
  END IF;
  
  -- Process employees with birthdays today (skip null dates)
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
  
  -- Only invoke edge function if there are notifications to send
  IF v_count > 0 THEN
    -- Edge function will be called by returning data indicating action needed
    RETURN jsonb_build_object(
      'processed', v_count, 
      'message', 'Notifications queued',
      'invoke_edge_function', true
    );
  ELSE
    RETURN jsonb_build_object('processed', 0, 'message', 'No birthdays today');
  END IF;
END;
$$;

-- Enhanced Anniversary Processing - Returns data for edge function
CREATE OR REPLACE FUNCTION public.process_anniversary_reminders_with_edge()
RETURNS jsonb
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
  -- Get active config for anniversary
  SELECT * INTO v_config 
  FROM public.automation_configs 
  WHERE reminder_type = 'anniversary' AND is_active = true
  LIMIT 1;
  
  IF v_config IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No active config');
  END IF;
  
  -- Get template
  SELECT * INTO v_template 
  FROM public.reminder_templates 
  WHERE id = v_config.template_id;
  
  IF v_template IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No template found');
  END IF;
  
  -- Process employees with anniversaries today (skip null dates)
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
  
  -- Only invoke edge function if there are notifications to send
  IF v_count > 0 THEN
    RETURN jsonb_build_object(
      'processed', v_count, 
      'message', 'Notifications queued',
      'invoke_edge_function', true
    );
  ELSE
    RETURN jsonb_build_object('processed', 0, 'message', 'No anniversaries today');
  END IF;
END;
$$;

-- Enhanced Task Deadline Processing - Returns data for edge function
CREATE OR REPLACE FUNCTION public.process_task_deadline_reminders_with_edge()
RETURNS jsonb
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
  -- Get active config for task_deadline
  SELECT * INTO v_config 
  FROM public.automation_configs 
  WHERE reminder_type = 'task_deadline' AND is_active = true
  LIMIT 1;
  
  IF v_config IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No active config');
  END IF;
  
  -- Get template
  SELECT * INTO v_template 
  FROM public.reminder_templates 
  WHERE id = v_config.template_id;
  
  IF v_template IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No template found');
  END IF;
  
  -- Process employees with task deadlines today
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
  
  -- Only invoke edge function if there are notifications to send
  IF v_count > 0 THEN
    RETURN jsonb_build_object(
      'processed', v_count, 
      'message', 'Notifications queued',
      'invoke_edge_function', true
    );
  ELSE
    RETURN jsonb_build_object('processed', 0, 'message', 'No task deadlines today');
  END IF;
END;
$$;

-- ============================================================================
-- CRON WRAPPER FUNCTIONS: Call edge function only when needed
-- ============================================================================

-- These wrapper functions process reminders and invoke the edge function if there are notifications

CREATE OR REPLACE FUNCTION public.cron_birthday_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.process_birthday_reminders_with_edge();
  
  -- Invoke edge function if there are notifications to send
  IF (v_result->>'invoke_edge_function')::boolean = true THEN
    PERFORM public.invoke_send_email_edge_function();
  END IF;
  
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_anniversary_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.process_anniversary_reminders_with_edge();
  
  -- Invoke edge function if there are notifications to send
  IF (v_result->>'invoke_edge_function')::boolean = true THEN
    PERFORM public.invoke_send_email_edge_function();
  END IF;
  
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_task_deadline_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.process_task_deadline_reminders_with_edge();
  
  -- Invoke edge function if there are notifications to send
  IF (v_result->>'invoke_edge_function')::boolean = true THEN
    PERFORM public.invoke_send_email_edge_function();
  END IF;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- CUSTOM EVENT PROCESSING: For custom/company-wide reminders
-- ============================================================================

-- Process custom event reminders
-- Custom events can target: all employees, specific department, or be manual
-- The automation_config can store targeting metadata
CREATE OR REPLACE FUNCTION public.process_custom_event_reminders_with_edge()
RETURNS jsonb
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
  v_target_department text;
BEGIN
  -- Get active config for custom_event
  SELECT * INTO v_config 
  FROM public.automation_configs 
  WHERE reminder_type = 'custom_event' AND is_active = true
  LIMIT 1;
  
  IF v_config IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No active custom event config');
  END IF;
  
  -- Get template
  SELECT * INTO v_template 
  FROM public.reminder_templates 
  WHERE id = v_config.template_id;
  
  IF v_template IS NULL THEN 
    RETURN jsonb_build_object('processed', 0, 'message', 'No template found');
  END IF;
  
  -- Check if there's a target department in the config name (format: "Custom: Department Name")
  -- This is a simple approach; could be enhanced with a separate metadata column
  IF v_config.name LIKE 'Custom: %' THEN
    v_target_department := substring(v_config.name from 9);
  ELSE
    v_target_department := NULL;
  END IF;
  
  -- Process all active employees, optionally filtered by department
  FOR v_employee IN 
    SELECT * FROM public.profiles 
    WHERE status = 'active'
      AND (v_target_department IS NULL OR department = v_target_department)
  LOOP
    v_subject := replace_template_variables(v_template.subject_template, v_employee);
    v_body := replace_template_variables(v_template.body_template, v_employee);
    
    INSERT INTO public.notifications (user_id, title, message, channel, status, metadata)
    VALUES (v_employee.id, v_subject, v_body, 'email', 'pending',
            jsonb_build_object('type', 'custom_event', 'config_id', v_config.id));
    v_count := v_count + 1;
  END LOOP;
  
  -- Return result
  IF v_count > 0 THEN
    RETURN jsonb_build_object(
      'processed', v_count, 
      'message', 'Custom event notifications queued',
      'invoke_edge_function', true
    );
  ELSE
    RETURN jsonb_build_object('processed', 0, 'message', 'No recipients for custom event');
  END IF;
END;
$$;

-- Cron wrapper for custom events
CREATE OR REPLACE FUNCTION public.cron_custom_event_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.process_custom_event_reminders_with_edge();
  
  -- Invoke edge function if there are notifications to send
  IF (v_result->>'invoke_edge_function')::boolean = true THEN
    PERFORM public.invoke_send_email_edge_function();
  END IF;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC: Get available template variables with descriptions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_template_variables()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_array(
    jsonb_build_object('key', '{{name}}', 'description', 'Employee full name', 'field', 'full_name'),
    jsonb_build_object('key', '{{email}}', 'description', 'Employee email address', 'field', 'email'),
    jsonb_build_object('key', '{{department}}', 'description', 'Employee department', 'field', 'department'),
    jsonb_build_object('key', '{{job_title}}', 'description', 'Employee job title', 'field', 'job_title'),
    jsonb_build_object('key', '{{company}}', 'description', 'Company name', 'field', null)
  );
$$;

-- ============================================================================
-- RPC: Update template with required variables
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_reminder_template_full(
  p_template_id uuid,
  p_name text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_required_variables text[] DEFAULT NULL,
  p_description text DEFAULT NULL
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
  SET 
    name = COALESCE(p_name, name),
    subject_template = COALESCE(p_subject, subject_template),
    body_template = COALESCE(p_body, body_template),
    required_variables = COALESCE(p_required_variables, required_variables),
    description = COALESCE(p_description, description)
  WHERE id = p_template_id;
END;
$$;

-- ============================================================================
-- RPC: Create automation with full control
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_full_automation(
  p_name text,
  p_reminder_type public.reminder_type,
  p_trigger_cron text,
  p_template_id uuid,
  p_is_active boolean DEFAULT true
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
  
  -- Generate job name and command
  v_job_name := 'job_' || replace(lower(p_name), ' ', '_') || '_' || floor(extract(epoch from now()))::text;
  
  -- Use enhanced cron functions that check for data before processing
  v_command := CASE p_reminder_type
    WHEN 'birthday' THEN 'SELECT public.cron_birthday_check()'
    WHEN 'anniversary' THEN 'SELECT public.cron_anniversary_check()'
    WHEN 'task_deadline' THEN 'SELECT public.cron_task_deadline_check()'
    WHEN 'custom_event' THEN 'SELECT public.cron_custom_event_check()'
    ELSE 'SELECT 1'
  END;

  INSERT INTO public.automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
  VALUES (p_name, p_reminder_type, p_trigger_cron, p_template_id, p_is_active, v_job_name, v_command)
  RETURNING id INTO v_id;
  
  -- Create the cron job only if active
  IF p_is_active THEN
    PERFORM cron.schedule(v_job_name, p_trigger_cron, v_command);
  END IF;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- RPC: Get cron presets for UI
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_cron_presets()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_array(
    jsonb_build_object('label', 'Daily at 9:00 AM', 'value', '0 9 * * *', 'description', 'Runs every day at 9:00 AM'),
    jsonb_build_object('label', 'Daily at 8:00 AM', 'value', '0 8 * * *', 'description', 'Runs every day at 8:00 AM'),
    jsonb_build_object('label', 'Daily at 10:00 AM', 'value', '0 10 * * *', 'description', 'Runs every day at 10:00 AM'),
    jsonb_build_object('label', 'Every Monday at 9:00 AM', 'value', '0 9 * * 1', 'description', 'Runs every Monday at 9:00 AM'),
    jsonb_build_object('label', 'Every Friday at 5:00 PM', 'value', '0 17 * * 5', 'description', 'Runs every Friday at 5:00 PM'),
    jsonb_build_object('label', 'First of Month at 9:00 AM', 'value', '0 9 1 * *', 'description', 'Runs on the first day of each month'),
    jsonb_build_object('label', 'Every Hour', 'value', '0 * * * *', 'description', 'Runs at the start of every hour'),
    jsonb_build_object('label', 'Every 30 Minutes', 'value', '*/30 * * * *', 'description', 'Runs every 30 minutes')
  );
$$;

-- ============================================================================
-- HELPER: Invoke send-email edge function using vault secrets
-- ============================================================================

-- Function to invoke the send-email edge function
CREATE OR REPLACE FUNCTION public.invoke_send_email_edge_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_request_id bigint;
BEGIN
  -- Retrieve secrets from vault
  BEGIN
    SELECT decrypted_secret INTO v_supabase_url 
    FROM vault.decrypted_secrets 
    WHERE name = 'supabase_url';
    
    SELECT decrypted_secret INTO v_service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key';

    IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE NOTICE 'Vault secrets not configured. Edge function not invoked.';
      RETURN;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to retrieve secrets from vault: %', SQLERRM;
      RETURN;
  END;

  -- Make HTTP request to edge function using pg_net
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;
  
  RAISE NOTICE 'Edge function invoked with request ID: %', v_request_id;
END;
$$;

-- ============================================================================
-- RPC: Send manual email to selected recipients
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_manual_email(
  p_recipient_ids uuid[],
  p_subject text,
  p_body text,
  p_use_template_variables boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee record;
  v_count integer := 0;
  v_subject text;
  v_body text;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Process each recipient
  FOR v_employee IN 
    SELECT * FROM public.profiles 
    WHERE id = ANY(p_recipient_ids)
      AND status = 'active'
  LOOP
    -- Replace template variables if enabled
    IF p_use_template_variables THEN
      v_subject := replace_template_variables_text(p_subject, v_employee.full_name, v_employee.email, v_employee.department, v_employee.job_title);
      v_body := replace_template_variables_text(p_body, v_employee.full_name, v_employee.email, v_employee.department, v_employee.job_title);
    ELSE
      v_subject := p_subject;
      v_body := p_body;
    END IF;
    
    -- Queue notification
    INSERT INTO public.notifications (user_id, title, message, channel, status, metadata)
    VALUES (v_employee.id, v_subject, v_body, 'email', 'pending',
            jsonb_build_object('type', 'manual', 'sent_by', auth.uid()));
    v_count := v_count + 1;
  END LOOP;
  
  -- Invoke edge function to send queued emails
  IF v_count > 0 THEN
    PERFORM public.invoke_send_email_edge_function();
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'queued', v_count,
    'message', v_count || ' email(s) queued for sending'
  );
END;
$$;

-- Send email to all active employees
CREATE OR REPLACE FUNCTION public.send_email_to_all(
  p_subject text,
  p_body text,
  p_use_template_variables boolean DEFAULT true,
  p_department text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee record;
  v_count integer := 0;
  v_subject text;
  v_body text;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Process each active employee, optionally filtering by department
  FOR v_employee IN 
    SELECT * FROM public.profiles 
    WHERE status = 'active'
      AND (p_department IS NULL OR department = p_department)
  LOOP
    -- Replace template variables if enabled
    IF p_use_template_variables THEN
      v_subject := replace_template_variables_text(p_subject, v_employee.full_name, v_employee.email, v_employee.department, v_employee.job_title);
      v_body := replace_template_variables_text(p_body, v_employee.full_name, v_employee.email, v_employee.department, v_employee.job_title);
    ELSE
      v_subject := p_subject;
      v_body := p_body;
    END IF;
    
    -- Queue notification
    INSERT INTO public.notifications (user_id, title, message, channel, status, metadata)
    VALUES (v_employee.id, v_subject, v_body, 'email', 'pending',
            jsonb_build_object('type', 'manual_bulk', 'sent_by', auth.uid(), 'department', p_department));
    v_count := v_count + 1;
  END LOOP;
  
  -- Invoke edge function to send queued emails
  IF v_count > 0 THEN
    PERFORM public.invoke_send_email_edge_function();
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'queued', v_count,
    'message', v_count || ' email(s) queued for sending'
  );
END;
$$;

-- Get list of departments for filtering
CREATE OR REPLACE FUNCTION public.get_departments()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(DISTINCT department) 
  FROM public.profiles 
  WHERE department IS NOT NULL AND department != '';
$$;

-- ============================================================================
-- RPC: Template Management Functions
-- ============================================================================

-- Create a new reminder template
CREATE OR REPLACE FUNCTION public.create_reminder_template(
  p_name text,
  p_subject_template text,
  p_body_template text,
  p_required_variables text[] DEFAULT '{}',
  p_description text DEFAULT NULL,
  p_channel text[] DEFAULT ARRAY['email']
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Check for duplicate name
  IF EXISTS (SELECT 1 FROM public.reminder_templates WHERE name = p_name) THEN
    RAISE EXCEPTION 'A template with this name already exists';
  END IF;
  
  -- Insert template
  INSERT INTO public.reminder_templates (
    name, 
    subject_template, 
    body_template, 
    required_variables, 
    description, 
    channel,
    created_by
  )
  VALUES (
    p_name, 
    p_subject_template, 
    p_body_template, 
    p_required_variables, 
    p_description, 
    p_channel::notification_channel[],
    auth.uid()
  )
  RETURNING id INTO v_template_id;
  
  RETURN v_template_id;
END;
$$;

-- Check if a template is being used by any automation
CREATE OR REPLACE FUNCTION public.get_template_usage(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_automations jsonb;
  v_count integer;
BEGIN
  -- Get automations using this template
  SELECT 
    jsonb_agg(jsonb_build_object('id', id, 'name', name)),
    COUNT(*)
  INTO v_automations, v_count
  FROM public.automation_configs
  WHERE template_id = p_template_id;
  
  RETURN jsonb_build_object(
    'in_use', v_count > 0,
    'usage_count', v_count,
    'automations', COALESCE(v_automations, '[]'::jsonb)
  );
END;
$$;

-- Delete a reminder template (with protection)
CREATE OR REPLACE FUNCTION public.delete_reminder_template(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_count integer;
  v_template_name text;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get template name
  SELECT name INTO v_template_name FROM public.reminder_templates WHERE id = p_template_id;
  
  IF v_template_name IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Check if template is in use
  SELECT COUNT(*) INTO v_usage_count
  FROM public.automation_configs
  WHERE template_id = p_template_id;
  
  IF v_usage_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete template: It is being used by % automation rule(s). Remove the attached automations first.', v_usage_count;
  END IF;
  
  -- Delete template
  DELETE FROM public.reminder_templates WHERE id = p_template_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Template "' || v_template_name || '" deleted successfully'
  );
END;
$$;
