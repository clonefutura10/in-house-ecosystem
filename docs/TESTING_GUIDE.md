# Comprehensive Feature Testing Guide

**Date:** December 12, 2024

This document provides step-by-step instructions for testing all features of the In-House Ecosystem application.

---

## 📋 Testing Checklist

### Phase 1: User Account Testing

#### 1.1 Create Test Employee Accounts (via Supabase SQL Editor)

Run these SQL commands in your **Supabase Dashboard > SQL Editor**:

```sql
-- First, create users via Supabase Auth (do this in Dashboard > Authentication > Add User)
-- Or use these direct inserts for testing (after creating auth users):

-- OPTION 1: If you have existing auth users, update their profiles:
-- View existing profiles
SELECT id, email, full_name, role, status, date_of_birth, work_anniversary 
FROM profiles;

-- OPTION 2: Create test employees by signing up via the app
-- Go to http://localhost:3000/signup and create these accounts:
-- - employee1@test.com / Password123
-- - employee2@test.com / Password123
-- - employee3@test.com / Password123
```

#### 1.2 Update Test Profiles with Full Data

After creating accounts, update their profiles:

```sql
-- Update Employee 1: Set birthday to TODAY for testing
UPDATE profiles 
SET 
  full_name = 'John Smith',
  department = 'Engineering',
  job_title = 'Software Developer',
  date_of_birth = (CURRENT_DATE - INTERVAL '25 years')::date,  -- Birthday TODAY!
  work_anniversary = (CURRENT_DATE - INTERVAL '2 years')::date, -- Anniversary TODAY!
  status = 'active'
WHERE email = 'employee1@test.com';

-- Update Employee 2: Regular dates
UPDATE profiles 
SET 
  full_name = 'Jane Doe',
  department = 'Marketing',
  job_title = 'Marketing Manager',
  date_of_birth = '1992-06-15',
  work_anniversary = '2023-03-01',
  status = 'active'
WHERE email = 'employee2@test.com';

-- Update Employee 3: Set anniversary to TODAY for testing
UPDATE profiles 
SET 
  full_name = 'Bob Wilson',
  department = 'Sales',
  job_title = 'Sales Representative',
  date_of_birth = '1988-09-22',
  work_anniversary = CURRENT_DATE,  -- Anniversary TODAY!
  status = 'active'
WHERE email = 'employee3@test.com';

-- Verify updates
SELECT id, email, full_name, department, job_title, 
       date_of_birth, work_anniversary, status, role
FROM profiles
ORDER BY email;
```

---

### Phase 2: Task Management Testing

#### 2.1 Create Test Tasks

Run these commands in Supabase SQL Editor:

```sql
-- Get employee IDs first
SELECT id, full_name FROM profiles WHERE role = 'employee';

-- Create test tasks (replace UUIDs with actual employee IDs from above query)
-- Task 1: Due TODAY (for deadline reminder testing)
INSERT INTO tasks (title, description, status, priority, assigned_to, due_date, is_archived)
SELECT 
  'Complete Project Proposal',
  'Write and submit the Q1 project proposal document',
  'in_progress',
  'high',
  id,
  CURRENT_DATE,  -- Due TODAY!
  false
FROM profiles WHERE email = 'employee1@test.com';

-- Task 2: Regular task
INSERT INTO tasks (title, description, status, priority, assigned_to, due_date, is_archived)
SELECT 
  'Review Code Changes',
  'Review pull requests from the development team',
  'todo',
  'medium',
  id,
  CURRENT_DATE + INTERVAL '3 days',
  false
FROM profiles WHERE email = 'employee2@test.com';

-- Task 3: Urgent task
INSERT INTO tasks (title, description, status, priority, assigned_to, due_date, is_archived)
SELECT 
  'Client Meeting Prep',
  'Prepare presentation for client meeting',
  'todo',
  'urgent',
  id,
  CURRENT_DATE + INTERVAL '1 day',
  false
FROM profiles WHERE email = 'employee3@test.com';

-- Task 4: Blocked task
INSERT INTO tasks (title, description, status, priority, assigned_to, due_date, is_archived)
VALUES (
  'Database Migration',
  'Migrate legacy database to new schema',
  'blocked',
  'high',
  NULL,  -- Unassigned
  CURRENT_DATE + INTERVAL '7 days',
  false
);

-- Verify tasks
SELECT t.id, t.title, t.status, t.priority, t.due_date, p.full_name as assignee
FROM tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
ORDER BY t.due_date;
```

---

### Phase 3: Reminder System Testing

#### 3.1 Verify Automation Configs Exist

```sql
-- Check existing automation configs
SELECT id, name, reminder_type, trigger_cron, is_active, template_id
FROM automation_configs
ORDER BY name;

-- Check reminder templates
SELECT id, name, subject_template, body_template, channel
FROM reminder_templates
ORDER BY name;
```

#### 3.2 Create Test Automation Configs (if none exist)

```sql
-- First, get template IDs
SELECT id, name FROM reminder_templates;

-- Create Birthday Reminder Config (if not exists)
INSERT INTO automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 
  'Daily Birthday Check',
  'birthday',
  '0 9 * * *',
  id,
  true,
  'job_daily_birthday_check',
  'SELECT public.cron_birthday_check()'
FROM reminder_templates WHERE name = 'Birthday Wishes'
ON CONFLICT DO NOTHING;

-- Create Anniversary Reminder Config (if not exists)
INSERT INTO automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 
  'Daily Anniversary Check',
  'anniversary',
  '0 9 * * *',
  id,
  true,
  'job_daily_anniversary_check',
  'SELECT public.cron_anniversary_check()'
FROM reminder_templates WHERE name = 'Work Anniversary'
ON CONFLICT DO NOTHING;

-- Create Task Deadline Reminder Config (if not exists)
INSERT INTO automation_configs (name, reminder_type, trigger_cron, template_id, is_active, cron_job_name, cron_command)
SELECT 
  'Daily Task Deadline Check',
  'task_deadline',
  '0 8 * * *',
  id,
  true,
  'job_daily_task_deadline_check',
  'SELECT public.cron_task_deadline_check()'
FROM reminder_templates WHERE name LIKE '%Task%Deadline%'
ON CONFLICT DO NOTHING;
```

---

### Phase 4: Run Cron Jobs Manually

**⚠️ Important:** Run these in Supabase SQL Editor to simulate what the cron jobs would do:

#### 4.1 Test Birthday Reminders

```sql
-- Run the birthday check
SELECT public.cron_birthday_check();

-- Check if notifications were created
SELECT n.id, n.title, n.message, n.status, n.channel, p.full_name as recipient
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.metadata->>'type' = 'birthday'
ORDER BY n.created_at DESC
LIMIT 10;
```

#### 4.2 Test Anniversary Reminders

```sql
-- Run the anniversary check
SELECT public.cron_anniversary_check();

-- Check if notifications were created
SELECT n.id, n.title, n.message, n.status, n.channel, p.full_name as recipient
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.metadata->>'type' = 'anniversary'
ORDER BY n.created_at DESC
LIMIT 10;
```

#### 4.3 Test Task Deadline Reminders

```sql
-- Run the task deadline check
SELECT public.cron_task_deadline_check();

-- Check if notifications were created
SELECT n.id, n.title, n.message, n.status, n.channel, p.full_name as recipient
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
WHERE n.metadata->>'type' = 'task_deadline'
ORDER BY n.created_at DESC
LIMIT 10;
```

#### 4.4 View All Notifications

```sql
-- View all notifications with details
SELECT 
  n.id,
  n.title,
  n.message,
  n.status,
  n.channel,
  n.created_at,
  n.sent_at,
  p.full_name as recipient,
  p.email as recipient_email,
  n.metadata
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
ORDER BY n.created_at DESC;
```

---

### Phase 5: UI Feature Testing

#### 5.1 Admin Account Testing

1. **Login as Admin:**
   - Go to http://localhost:3000/login
   - Login with admin credentials

2. **Dashboard Check:**
   - Verify stats cards show correct counts
   - Check recent tasks list

3. **Tasks Page:**
   - [ ] View all tasks in table
   - [ ] Filter by status (To Do, In Progress, Review, Done, Blocked)
   - [ ] Filter by priority (Low, Medium, High, Urgent)
   - [ ] Search tasks
   - [ ] Create new task
   - [ ] Assign task to employee
   - [ ] Update task status
   - [ ] Archive/Restore tasks
   - [ ] View task details in side sheet

4. **Team Page:**
   - [ ] View all team members
   - [ ] View employee profiles
   - [ ] Check profile details (birthday, anniversary, department)

5. **Templates Page:**
   - [ ] View all reminder templates
   - [ ] Edit template subject/body
   - [ ] Test template variable preview

6. **Notifications Page (New!):**
   - [ ] View all notifications
   - [ ] Filter by status (Pending, Sent, Failed)
   - [ ] Filter by channel (Email, System, Slack, WhatsApp)
   - [ ] Search notifications
   - [ ] Verify stats cards are accurate

7. **Settings Page:**
   - [ ] View automation rules
   - [ ] Create new automation rule
   - [ ] Edit automation schedule (using new time picker!)
   - [ ] Toggle automation active/inactive
   - [ ] Compose email to employees
   - [ ] Send email to specific recipients

#### 5.2 Employee Account Testing

1. **Login as Employee:**
   - Logout admin
   - Login with employee credentials

2. **Dashboard Check:**
   - Verify employee sees only their tasks

3. **My Tasks Page:**
   - [ ] View assigned tasks only
   - [ ] Update task status
   - [ ] Cannot assign tasks (should be disabled)

4. **Profile Page:**
   - [ ] View own profile
   - [ ] Edit profile fields

---

### Phase 6: Data Verification Queries

Run these to verify your test data:

```sql
-- Summary of all data
SELECT 'Profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'Templates', COUNT(*) FROM reminder_templates
UNION ALL
SELECT 'Automation Configs', COUNT(*) FROM automation_configs;

-- Profiles with birthday/anniversary today
SELECT full_name, email, date_of_birth, work_anniversary
FROM profiles
WHERE 
  (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE))
  OR
  (EXTRACT(MONTH FROM work_anniversary) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(DAY FROM work_anniversary) = EXTRACT(DAY FROM CURRENT_DATE));

-- Tasks due today
SELECT t.title, t.status, t.due_date, p.full_name as assignee
FROM tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
WHERE t.due_date::date = CURRENT_DATE AND t.status != 'done';

-- Notification statistics
SELECT 
  status,
  channel,
  COUNT(*) as count
FROM notifications
GROUP BY status, channel
ORDER BY status, channel;
```

---

### Phase 7: Cleanup (Optional)

After testing, you can clean up test data:

```sql
-- Clear test notifications
DELETE FROM notifications WHERE created_at > CURRENT_DATE - INTERVAL '1 day';

-- Reset task statuses
UPDATE tasks SET status = 'todo' WHERE status != 'done';

-- Clear test employees (BE CAREFUL!)
-- DELETE FROM profiles WHERE email LIKE '%@test.com';
```

---

## 🔍 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Cron function returns 0 processed | Check if automation_config is active and has a valid template_id |
| No notifications created | Verify profiles have date_of_birth/work_anniversary matching today |
| Task deadline not triggering | Ensure task has due_date = TODAY and status != 'done' |
| Edge function not invoked | Check vault secrets are configured (supabase_url, service_role_key) |

---

## ✅ Test Completion Checklist

- [ ] Created 3+ test employee accounts
- [ ] Updated profiles with dates (birthday/anniversary today)
- [ ] Created 4+ test tasks with various statuses/priorities
- [ ] Ran cron_birthday_check() successfully
- [ ] Ran cron_anniversary_check() successfully  
- [ ] Ran cron_task_deadline_check() successfully
- [ ] Verified notifications appear in Notifications page
- [ ] Tested time schedule picker works
- [ ] Tested task filtering and search
- [ ] Tested notification filtering and search
