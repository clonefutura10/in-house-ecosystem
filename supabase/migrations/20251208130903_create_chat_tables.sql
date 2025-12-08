-- Chat Sessions Table
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text,
  metadata jsonb,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat Messages Table
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null, -- 'user', 'assistant', 'system'
  content text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Policies
create policy "Users Manage Own Sessions"
  on public.chat_sessions for all
  using ( user_id = auth.uid() );

create policy "Users Manage Own Messages"
  on public.chat_messages for all
  using (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

-- Admins can view all (Optional, mainly for oversight/debugging)
create policy "Admins View All Sessions"
  on public.chat_sessions for select
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create policy "Admins View All Messages"
  on public.chat_messages for select
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );
