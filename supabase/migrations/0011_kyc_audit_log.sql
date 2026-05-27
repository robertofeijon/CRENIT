create table if not exists public.kyc_audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  previous_status text,
  next_status text,
  reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_kyc_audit_log_user_id on public.kyc_audit_log(user_id);
create index if not exists idx_kyc_audit_log_created_at on public.kyc_audit_log(created_at desc);
