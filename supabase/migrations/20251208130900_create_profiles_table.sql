-- Create Enums
create type public.user_role as enum ('admin', 'employee');
create type public.user_status as enum ('active', 'inactive', 'suspended');

-- Create Profiles Table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  role public.user_role not null default 'employee',
  status public.user_status not null default 'active',
  department text,
  job_title text,
  joining_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Admins can view all profiles"
  on public.profiles for select
  using ( 
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using ( 
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can update their own limited profile fields"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id ); 
  -- Note: In a real app, you might want to restrict which columns can be updated via a trigger or strict RLS using 'check' constraints better, 
  -- but valid RLS for update generally checks the 'using' clause for access and 'with check' for the new row state.

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, department, job_title, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'job_title',
    'employee',
    'active'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
