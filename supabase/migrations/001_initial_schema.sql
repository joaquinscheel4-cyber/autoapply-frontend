-- AutoApply Chile — Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
create table if not exists public.profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  cv_url text,
  cv_text text,
  parsed_cv jsonb,
  preferences jsonb,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- ============================================================
-- JOBS TABLE
-- ============================================================
create table if not exists public.jobs (
  id uuid default uuid_generate_v4() primary key,
  external_id text unique not null,
  title text not null,
  company text not null,
  location text not null default 'Chile',
  modality text check (modality in ('remote', 'hybrid', 'presencial')),
  description text not null default '',
  apply_email text,
  apply_link text,
  source text not null default 'jsearch',
  country text not null default 'CL',
  skills text[] default '{}',
  seniority text,
  salary_min integer,
  salary_max integer,
  posted_at timestamptz,
  fetched_at timestamptz default now()
);

-- Jobs are public (everyone can see all jobs)
alter table public.jobs enable row level security;

create policy "Jobs are publicly readable"
  on public.jobs for select
  using (true);

-- Only service role can insert/update jobs (cron job)
create policy "Service role can manage jobs"
  on public.jobs for all
  using (auth.role() = 'service_role');

-- Index for performance
create index if not exists jobs_country_idx on public.jobs(country);
create index if not exists jobs_fetched_at_idx on public.jobs(fetched_at desc);

-- ============================================================
-- APPLICATIONS TABLE
-- ============================================================
create table if not exists public.applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete set null,
  cover_letter_text text default '',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  email_message_id text,
  triggered_by text not null default 'manual'
    check (triggered_by in ('cron', 'manual')),
  created_at timestamptz default now(),

  -- Prevent duplicate applications
  unique(user_id, job_id)
);

alter table public.applications enable row level security;

create policy "Users can view own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id);

-- Service role can manage all applications (for cron)
create policy "Service role can manage all applications"
  on public.applications for all
  using (auth.role() = 'service_role');

create index if not exists applications_user_id_idx on public.applications(user_id);
create index if not exists applications_created_at_idx on public.applications(created_at desc);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Create the CVs bucket (run this separately if SQL editor doesn't support it)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload their own CV"
  on storage.objects for insert
  with check (
    bucket_id = 'cvs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own CV"
  on storage.objects for select
  using (
    bucket_id = 'cvs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own CV"
  on storage.objects for update
  using (
    bucket_id = 'cvs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role can read all CVs (for cron job)
create policy "Service role can read all CVs"
  on storage.objects for select
  using (
    bucket_id = 'cvs'
    and auth.role() = 'service_role'
  );

-- ============================================================
-- HELPER: Auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
