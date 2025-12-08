-- Create Enums
create type public.reminder_type as enum ('birthday', 'anniversary', 'holiday', 'custom_event', 'task_deadline');
create type public.notification_channel as enum ('system', 'email', 'slack', 'whatsapp');

-- Reminder Templates Table
create table public.reminder_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  subject_template text,
  body_template text not null,
  channel public.notification_channel[] default '{system, email}',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Automation Configs Table
create table public.automation_configs (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  trigger_cron text not null,
  reminder_type public.reminder_type not null,
  template_id uuid references public.reminder_templates(id),
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- Notifications Table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  title text not null,
  message text not null,
  channel public.notification_channel not null,
  status text default 'pending',
  scheduled_for timestamptz default now(),
  sent_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.reminder_templates enable row level security;
alter table public.automation_configs enable row level security;
alter table public.notifications enable row level security;

-- Policies for Templates & Configs (Admin Only)
create policy "Admins Manage Templates"
  on public.reminder_templates for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create policy "Admins Manage Configs"
  on public.automation_configs for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );
  
-- Policies for Notifications
create policy "Users View Own Notifications"
  on public.notifications for select
  using ( user_id = auth.uid() );

create policy "Admins View All Notifications"
  on public.notifications for select
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- System/Admin can create notifications (usually via backend service role, but allow admin for manual)
create policy "Admins Create Notifications"
  on public.notifications for insert
  with check ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );
