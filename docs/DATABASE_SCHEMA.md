# Database Schema Design

This document outlines the database schema for the "In-House Ecosystem" project, built on Supabase (PostgreSQL). It includes tables, relationships, RLS policies, and automation triggers.

## 1. Overview
- **Backend**: Supabase (PostgreSQL 15+)
- **Auth**: Supabase Auth (with `public.profiles` extension)
- **Permissions**: Row Level Security (RLS) is enabled on ALL tables.

## 2. Tables

### 2.1 Users & Profiles
Extends Supabase's `auth.users` to store application-specific user data.

```sql
create type user_role as enum ('admin', 'employee');
create type user_status as enum ('active', 'inactive', 'suspended');

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  role user_role not null default 'employee',
  status user_status not null default 'active',
  department text,
  job_title text,
  joining_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS:
-- Users can read their own profile.
-- Admins can read/update all profiles.
```

### 2.2 Task Management
Core feature for assigning and tracking work.

```sql
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum ('todo', 'in_progress', 'review', 'done', 'blocked');

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  priority task_priority default 'medium',
  status task_status default 'todo',
  assigned_to uuid references public.profiles(id), -- Null if unassigned
  created_by uuid references public.profiles(id) default auth.uid(),
  due_date timestamptz,
  tags text[], -- Array of strings for flexible categorization
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  is_internal boolean default false, -- If true, visible only to admins? (Optional)
  created_at timestamptz default now()
);

create table public.task_attachments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  uploaded_by uuid references public.profiles(id) not null,
  file_url text not null,
  file_name text not null,
  file_type text,
  created_at timestamptz default now()
);

-- RLS:
-- tasks:
--   - Select: user = assigned_to OR user = created_by OR role = 'admin'
--   - Insert: role = 'admin' OR (role = 'employee' AND created_by = auth.uid()) -> Strict mode: Employees can create tasks (self-assigned?)
--   - Update: user = assigned_to (only status) OR role = 'admin' (all fields)
```

### 2.3 Performance Management
Tracks metrics and appraisals. (Admin-managed, currently simplified view for others).

```sql
create type appraisal_period as enum ('monthly', 'quarterly', 'yearly');

create table public.performance_metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  period_start date not null,
  period_end date not null,
  tasks_completed int default 0,
  on_time_completion_rate float, -- Percentage
  attendance_score float, -- From external system or manual input
  quality_rating float, -- 1-5 scale
  manager_notes text,
  created_at timestamptz default now()
);

create table public.appraisals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  reviewer_id uuid references public.profiles(id) not null,
  period appraisal_period not null,
  review_date date default current_date,
  overall_score float,
  comments text,
  is_published boolean default false, -- Visible to employee only when true
  created_at timestamptz default now()
);

-- RLS:
-- Admin: Full access.
-- Employee: View own records if is_published = true.
```

### 2.4 Reminders & Notifications
Supports cron-job based automation and manual reminders.

```sql
create type reminder_type as enum ('birthday', 'anniversary', 'holiday', 'custom_event', 'task_deadline');
create type notification_channel as enum ('system', 'email', 'slack', 'whatsapp');

-- Templates for reusable message formats
create table public.reminder_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- e.g., "Birthday Greeting v1"
  subject_template text, -- For emails
  body_template text not null, -- Supports variables {{name}}, {{date}}
  channel notification_channel[] default '{system, email}',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Configuration for automated jobs (e.g., "Run Birthday Check daily at 9 AM")
create table public.automation_configs (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  trigger_cron text not null, -- e.g., '0 9 * * *'
  reminder_type reminder_type not null,
  template_id uuid references public.reminder_templates(id),
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- Individual scheduled/sent reminders
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id), -- Recipient
  title text not null,
  message text not null,
  channel notification_channel not null,
  status text default 'pending', -- pending, sent, failed
  scheduled_for timestamptz default now(),
  sent_at timestamptz,
  metadata jsonb, -- Stores related object ID (e.g., task_id)
  created_at timestamptz default now()
);
```

### 2.5 Chatbot Memory
Stores conversation history/context for the LangChain agent.

```sql
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text,
  metadata jsonb, -- Store agent settings, context summary
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null, -- 'user', 'assistant', 'system'
  content text not null,
  metadata jsonb, -- Token usage, tool calls
  created_at timestamptz default now()
);

-- RLS:
-- Users can only access their own chat sessions.
-- Admins can view all (for audit purposes, if required by policy).
```

## 3. Automation & Triggers (Conceptual)

### 3.1 Triggers
- `on_auth_user_created`: Automatically inserts a row into `public.profiles`.
- `update_task_timestamp`: Updates `updated_at` on task changes.

### 3.2 Scheduled Jobs (pg_cron)
These will be defined in migration files.
- `daily_birthday_check`: Runs daily, queries `profiles` for matching birth dates, inserts into `notifications`.
- `task_deadline_check`: Runs daily/hourly, finds tasks due soon, inserts into `notifications`.

## 4. Security & RLS Policies
All tables must have `alter table ... enable row level security;`.

### Profiles
- `create`: Managed by trigger.
- `select`: `auth.uid() = id` OR `is_admin()`.
- `update`: `auth.uid() = id` (limited fields) OR `is_admin()`.

### Tasks
- `select`: `assigned_to = auth.uid()` OR `created_by = auth.uid()` OR `is_admin()`.
- `update`: `is_admin()` OR (`assigned_to = auth.uid()` AND `status` IN (...)).

### Chat
- `all`: `user_id = auth.uid()`.

## 5. Indexes
- `tasks(assigned_to, status)`: Filtered dashboards.
- `tasks(due_date)`: For deadline checking.
- `notifications(user_id, status)`: Fetching unread alerts.
- `chat_messages(session_id, created_at)`: Loading chat history.
