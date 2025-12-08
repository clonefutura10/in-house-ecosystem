-- Create Enums
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done', 'blocked');

-- Tasks Table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  priority public.task_priority default 'medium',
  status public.task_status default 'todo',
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id) default auth.uid(),
  due_date timestamptz,
  tags text[],
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Task Comments Table
create table public.task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  is_internal boolean default false,
  created_at timestamptz default now()
);

-- Task Attachments Table
create table public.task_attachments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  uploaded_by uuid references public.profiles(id) not null,
  file_url text not null,
  file_name text not null,
  file_type text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;

-- Policies for Tasks

-- Select: Admin can see all, Employee can see assigned or created by them
create policy "Admins View All Tasks"
  on public.tasks for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Employees View Involved Tasks"
  on public.tasks for select
  using (
    assigned_to = auth.uid() or created_by = auth.uid()
  );

-- Insert: Admin can insert, Employee can insert (self-created)
create policy "Admins Create Tasks"
  on public.tasks for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Employees Create Tasks"
  on public.tasks for insert
  with check (
    created_by = auth.uid()
  );

-- Update: Admin all, Employee limited
create policy "Admins Update Tasks"
  on public.tasks for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Employees Update Assigned Tasks"
  on public.tasks for update
  using (
    assigned_to = auth.uid()
  )
  with check (
    assigned_to = auth.uid()
    -- Ideally restrict to status changes only via application logic or triggers, 
    -- as RLS cannot easily filter columns without check constraints on every column.
  );

-- Policies for Comments
create policy "View Comments"
  on public.task_comments for select
  using (
    exists (
      select 1 from public.tasks
      where id = task_comments.task_id
      and (
        assigned_to = auth.uid() 
        or created_by = auth.uid() 
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

create policy "Create Comments"
  on public.task_comments for insert
  with check (
    auth.uid() = user_id
  );

-- Policies for Attachments
create policy "View Attachments"
  on public.task_attachments for select
  using (
    exists (
      select 1 from public.tasks
      where id = task_attachments.task_id
      and (
        assigned_to = auth.uid() 
        or created_by = auth.uid() 
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

create policy "Upload Attachments"
  on public.task_attachments for insert
  with check (
    auth.uid() = uploaded_by
  );
