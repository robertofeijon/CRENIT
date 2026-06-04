-- Sale comps pilot storage, B2B licensable webhooks, suburb watch state

create table if not exists market_intelligence.sale_comps_records (
  id uuid primary key default gen_random_uuid(),
  partner_client_id uuid references market_intelligence.b2b_clients(id) on delete set null,
  suburb text not null,
  city text not null default 'Windhoek',
  property_type text,
  bedrooms integer,
  sale_price numeric not null check (sale_price > 0),
  price_per_sqm numeric,
  transfer_date date not null,
  month_year text not null,
  source_type text not null check (source_type in ('deeds', 'valuer', 'mls', 'bank_collateral', 'pilot_manual')),
  captured_at timestamptz not null default now()
);

create index if not exists idx_sale_comps_suburb on market_intelligence.sale_comps_records (suburb, city, transfer_date desc);

create table if not exists market_intelligence.licensable_suburb_watch (
  suburb text not null,
  city text not null default 'Windhoek',
  commercially_licensable boolean not null default false,
  transaction_count integer not null default 0,
  median_rent numeric,
  updated_at timestamptz not null default now(),
  primary key (suburb, city)
);

create table if not exists market_intelligence.b2b_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references market_intelligence.b2b_clients(id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default array['suburb.licensable'],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists market_intelligence.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references market_intelligence.b2b_webhook_subscriptions(id) on delete set null,
  event_type text not null,
  payload jsonb not null,
  response_status integer,
  created_at timestamptz not null default now()
);
