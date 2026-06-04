-- Track landlord emails when their suburb becomes commercially licensable

create table if not exists market_intelligence.landlord_licensable_notify_log (
  landlord_user_id uuid not null references public.profiles(id) on delete cascade,
  suburb text not null,
  city text not null default 'Windhoek',
  notified_at timestamptz not null default now(),
  primary key (landlord_user_id, suburb, city)
);

create index if not exists idx_landlord_licensable_notify_suburb
  on market_intelligence.landlord_licensable_notify_log (suburb, city);
