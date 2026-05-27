create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_type on public.notifications(type);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
