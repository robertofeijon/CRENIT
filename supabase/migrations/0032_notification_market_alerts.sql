alter table public.notification_preferences
  add column if not exists market_intelligence_alerts boolean not null default true;
