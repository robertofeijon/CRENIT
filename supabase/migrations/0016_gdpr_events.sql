create table if not exists public.gdpr_events (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('EXPORT', 'DELETION')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_gdpr_events_profile_id
  on public.gdpr_events(profile_id);
