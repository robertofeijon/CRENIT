create table if not exists public.kyc_flags (
  id uuid default gen_random_uuid() primary key,
  kyc_id uuid references public.kyc_documents(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  flag_type text not null,
  flag_note text,
  flagged_at timestamptz default now(),
  dismissed_by uuid references public.profiles(id) on delete set null,
  dismissed_at timestamptz,
  dismiss_note text
);

create index if not exists idx_kyc_flags_user_id
  on public.kyc_flags(user_id);
