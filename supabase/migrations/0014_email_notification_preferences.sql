create table if not exists public.notification_preferences (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade unique,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  rent_reminders boolean not null default true,
  payment_confirmations boolean not null default true,
  kyc_updates boolean not null default true,
  lease_events boolean not null default true,
  deposit_events boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_notification_preferences_profile_id
  on public.notification_preferences(profile_id);
