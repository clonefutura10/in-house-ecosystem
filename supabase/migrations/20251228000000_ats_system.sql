-- Create ATS System Tables for Resume Parser and ATS Calculator
-- Migration: 20251228000000_ats_system.sql

-- =====================================================
-- ENUMS
-- =====================================================

create type public.parsing_status as enum ('pending', 'processing', 'completed', 'failed');

-- =====================================================
-- ATS JOBS TABLE
-- =====================================================

create table public.ats_jobs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  department text,
  description text not null,
  required_skills text[] default '{}',
  preferred_skills text[] default '{}',
  experience_years_min int default 0,
  experience_years_max int,
  education_requirements text[] default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- ATS RESUMES TABLE
-- =====================================================

create table public.ats_resumes (
  id uuid default gen_random_uuid() primary key,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size int,
  uploaded_by uuid references public.profiles(id) on delete set null,
  parsing_status public.parsing_status default 'pending',
  parsing_error text,
  llamaparse_job_id text,
  created_at timestamptz default now()
);

-- =====================================================
-- PARSED RESUME DATA TABLE
-- =====================================================

create table public.parsed_resume_data (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references public.ats_resumes(id) on delete cascade not null unique,
  candidate_name text,
  email text,
  phone text,
  skills text[] default '{}',
  experience_years numeric(4,1),
  education jsonb default '[]',
  work_experience jsonb default '[]',
  raw_text text,
  parsed_at timestamptz default now()
);

-- =====================================================
-- ATS SCORES TABLE
-- =====================================================

create table public.ats_scores (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references public.ats_resumes(id) on delete cascade not null,
  job_id uuid references public.ats_jobs(id) on delete cascade not null,
  overall_score numeric(5,2) default 0,
  skill_match_score numeric(5,2) default 0,
  experience_score numeric(5,2) default 0,
  education_score numeric(5,2) default 0,
  keyword_density_score numeric(5,2) default 0,
  keyword_matches text[] default '{}',
  score_breakdown jsonb default '{}',
  calculated_at timestamptz default now(),
  unique(resume_id, job_id)
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

alter table public.ats_jobs enable row level security;
alter table public.ats_resumes enable row level security;
alter table public.parsed_resume_data enable row level security;
alter table public.ats_scores enable row level security;

-- =====================================================
-- RLS POLICIES - Admin Only Access
-- =====================================================

-- ATS Jobs Policies (Admin only)
create policy "Admins can view all jobs"
  on public.ats_jobs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can create jobs"
  on public.ats_jobs for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update jobs"
  on public.ats_jobs for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete jobs"
  on public.ats_jobs for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ATS Resumes Policies (Admin only)
create policy "Admins can view all resumes"
  on public.ats_resumes for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can upload resumes"
  on public.ats_resumes for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update resumes"
  on public.ats_resumes for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete resumes"
  on public.ats_resumes for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Parsed Resume Data Policies (Admin only)
create policy "Admins can view parsed data"
  on public.parsed_resume_data for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert parsed data"
  on public.parsed_resume_data for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update parsed data"
  on public.parsed_resume_data for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ATS Scores Policies (Admin only)
create policy "Admins can view scores"
  on public.ats_scores for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert scores"
  on public.ats_scores for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update scores"
  on public.ats_scores for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =====================================================
-- STORAGE BUCKET FOR RESUMES
-- =====================================================

-- Create the resumes bucket
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Storage policies for resumes bucket

-- Allow admins to upload files
create policy "Admins can upload resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes' 
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Allow admins to read files
create policy "Admins can read resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes' 
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Allow admins to update files
create policy "Admins can update resumes"
  on storage.objects for update
  using (
    bucket_id = 'resumes' 
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Allow admins to delete files
create policy "Admins can delete resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes' 
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

create or replace function public.handle_ats_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_ats_jobs_updated
  before update on public.ats_jobs
  for each row execute procedure public.handle_ats_updated_at();
