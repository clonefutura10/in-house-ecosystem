-- ============================================================================
-- COMPLETE SETUP: Birthday & Anniversary Auto-Mailing System
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Create/Update Reminder Templates
-- ============================================================================

-- Birthday Template
INSERT INTO reminder_templates (name, subject_template, body_template, channel, required_variables, description)
VALUES (
  'Birthday Wishes',
  '🎂 Happy Birthday, {{name}}!',
  E'Dear {{name}},\n\nWishing you a wonderful birthday filled with joy and happiness! 🎉\n\nMay this special day bring you everything you wish for.\n\nWarm regards,\nThe {{company}} Team',
  ARRAY['email']::notification_channel[],
  ARRAY['name', 'company'],
  'Automated birthday wishes sent to employees on their birthday'
)
ON CONFLICT (name) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template;

-- Work Anniversary Template  
INSERT INTO reminder_templates (name, subject_template, body_template, channel, required_variables, description)
VALUES (
  'Work Anniversary',
  '🎉 Happy Work Anniversary, {{name}}!',
  E'Dear {{name}},\n\nCongratulations on another year with us! 🌟\n\nThank you for your dedication, hard work, and contributions to our team. We truly appreciate having you!\n\nHere''s to many more successful years together.\n\nBest wishes,\nThe {{company}} Team',
  ARRAY['email']::notification_channel[],
  ARRAY['name', 'company'],
  'Automated work anniversary wishes sent to employees'
)
ON CONFLICT (name) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template;

-- Task Deadline Reminder Template
INSERT INTO reminder_templates (name, subject_template, body_template, channel, required_variables, description)
VALUES (
  'Task Deadline Reminder',
  '⏰ Task Deadline Today - Action Required',
  E'Hi {{name}},\n\nThis is a friendly reminder that you have task(s) due today.\n\nPlease log in to the Ecosystem to review and complete your pending tasks.\n\nBest,\nThe {{company}} Team',
  ARRAY['email']::notification_channel[],
  ARRAY['name', 'company'],
  'Reminder sent when tasks are due'
)
ON CONFLICT (name) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template;

-- Verify templates
SELECT id, name, subject_template FROM reminder_templates ORDER BY name;

-- ============================================================================
-- STEP 2: Create Automation Configs (with proper cron jobs)
-- ============================================================================

-- Delete any existing configs to recreate cleanly
DELETE FROM automation_configs WHERE reminder_type IN ('birthday', 'anniversary', 'task_deadline');

-- Birthday Automation - Runs daily at 9:00 AM
INSERT INTO automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 
  'Daily Birthday Check',
  'birthday'::reminder_type,
  '0 9 * * *',
  id,
  true,
  'job_birthday_' || floor(extract(epoch from now()))::text,
  'SELECT public.cron_birthday_check()'
FROM reminder_templates WHERE name = 'Birthday Wishes';

-- Anniversary Automation - Runs daily at 9:00 AM
INSERT INTO automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 
  'Daily Anniversary Check',
  'anniversary'::reminder_type,
  '0 9 * * *',
  id,
  true,
  'job_anniversary_' || floor(extract(epoch from now()))::text,
  'SELECT public.cron_anniversary_check()'
FROM reminder_templates WHERE name = 'Work Anniversary';

-- Task Deadline Automation - Runs daily at 8:00 AM
INSERT INTO automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 
  'Daily Task Deadline Check',
  'task_deadline'::reminder_type,
  '0 8 * * *',
  id,
  true,
  'job_task_deadline_' || floor(extract(epoch from now()))::text,
  'SELECT public.cron_task_deadline_check()'
FROM reminder_templates WHERE name = 'Task Deadline Reminder';

-- Verify automation configs
SELECT id, name, reminder_type, trigger_cron, is_active, cron_job_name FROM automation_configs ORDER BY name;

-- ============================================================================
-- STEP 3: Schedule the actual cron jobs in pg_cron
-- ============================================================================

-- Unschedule any existing jobs (ignore errors if they don't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('birthday_check_daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('anniversary_check_daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('task_deadline_check_daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule Birthday Check (9:00 AM daily - UTC, so adjust for your timezone)
-- For IST (UTC+5:30), 9 AM IST = 3:30 AM UTC
SELECT cron.schedule(
  'birthday_check_daily',
  '30 3 * * *',  -- 3:30 AM UTC = 9:00 AM IST
  $$SELECT public.cron_birthday_check()$$
);

-- Schedule Anniversary Check (9:00 AM daily - UTC)
SELECT cron.schedule(
  'anniversary_check_daily', 
  '30 3 * * *',  -- 3:30 AM UTC = 9:00 AM IST
  $$SELECT public.cron_anniversary_check()$$
);

-- Schedule Task Deadline Check (8:00 AM daily - UTC)
SELECT cron.schedule(
  'task_deadline_check_daily',
  '30 2 * * *',  -- 2:30 AM UTC = 8:00 AM IST
  $$SELECT public.cron_task_deadline_check()$$
);

-- Verify scheduled jobs
SELECT jobid, schedule, command, nodename FROM cron.job ORDER BY jobid;

-- ============================================================================
-- STEP 4: Set up test data (set someone's birthday to TODAY)
-- ============================================================================

-- Update one employee to have birthday TODAY for testing
UPDATE profiles 
SET date_of_birth = CURRENT_DATE - INTERVAL '25 years'
WHERE id = (
  SELECT id FROM profiles 
  WHERE role = 'employee' AND status = 'active' 
  LIMIT 1
);

-- View who has birthday/anniversary today
SELECT 
  full_name, 
  email, 
  date_of_birth,
  work_anniversary
FROM profiles 
WHERE 
  (date_of_birth IS NOT NULL 
   AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE))
  OR
  (work_anniversary IS NOT NULL 
   AND EXTRACT(MONTH FROM work_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(DAY FROM work_anniversary) = EXTRACT(DAY FROM CURRENT_DATE));

-- ============================================================================
-- STEP 5: Test the cron function manually
-- ============================================================================

-- Run birthday check NOW (this creates notifications)
SELECT public.cron_birthday_check();

-- View created notifications
SELECT 
  n.id,
  n.title,
  n.message,
  n.status,
  n.channel,
  n.created_at,
  p.full_name as recipient,
  p.email as recipient_email
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.created_at > NOW() - INTERVAL '1 hour'
ORDER BY n.created_at DESC;

-- ============================================================================
-- SETUP COMPLETE! 
-- Now configure SMTP secrets in Supabase Edge Functions settings
-- ============================================================================
