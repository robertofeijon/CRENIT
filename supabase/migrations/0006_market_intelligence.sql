-- Market intelligence schema: anonymised rental transaction data for B2B products

create schema if not exists market_intelligence;

-- Consent tracking (onboarding, not payment time)
create table public.data_sharing_consents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  consent_type text not null check (consent_type in ('LANDLORD_MARKET_DATA', 'TENANT_MARKET_DATA')),
  granted boolean not null default false,
  terms_version text not null default '1.0',
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, consent_type)
);

-- Anonymised per-payment market records (no PII)
create table market_intelligence.market_data_records (
  id uuid default gen_random_uuid() primary key,
  payment_id uuid not null unique,
  suburb text not null,
  city text not null default 'Windhoek',
  property_type text,
  bedrooms integer,
  geo_lat numeric,
  geo_lng numeric,
  verified_rent_amount numeric not null,
  payment_status text not null check (payment_status in ('on_time', 'late', 'missed')),
  days_to_pay integer not null default 0,
  lease_start_date date,
  income_bracket text,
  deposit_ratio numeric,
  month_year text not null,
  tenant_hash text,
  landlord_hash text,
  captured_at timestamptz default now()
);

create index idx_market_data_suburb on market_intelligence.market_data_records (suburb);
create index idx_market_data_month_year on market_intelligence.market_data_records (month_year);
create index idx_market_data_captured_at on market_intelligence.market_data_records (captured_at desc);
create index idx_market_data_tenant_hash on market_intelligence.market_data_records (tenant_hash);

-- B2B data product clients
create table market_intelligence.b2b_clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  client_type text not null check (client_type in ('Bank', 'Developer', 'Estate Agent', 'Government', 'Research Firm')),
  access_tier text not null check (access_tier in ('One-time report', 'Monthly subscription', 'API access')),
  subscription_status text not null default 'active' check (subscription_status in ('active', 'suspended', 'cancelled')),
  reports_pulled_this_month integer not null default 0,
  rate_limit_per_hour integer not null default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- API keys for B2B clients
create table market_intelligence.api_keys (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references market_intelligence.b2b_clients(id) on delete cascade not null,
  key_hash text not null unique,
  key_prefix text not null,
  label text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

create index idx_api_keys_client on market_intelligence.api_keys (client_id);

-- API usage logs
create table market_intelligence.api_usage_logs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references market_intelligence.b2b_clients(id) on delete set null,
  endpoint text not null,
  method text not null default 'GET',
  status_code integer,
  created_at timestamptz default now()
);

-- Configurable report products
create table market_intelligence.report_products (
  id uuid default gen_random_uuid() primary key,
  report_type text not null unique check (report_type in (
    'suburb_report',
    'city_overview',
    'lender_risk_pack',
    'development_feasibility'
  )),
  display_name text not null,
  description text,
  price_nad numeric not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz default now()
);

-- Report generation audit log
create table market_intelligence.report_generations (
  id uuid default gen_random_uuid() primary key,
  report_type text not null,
  suburb text,
  generated_by uuid references public.profiles(id),
  client_id uuid references market_intelligence.b2b_clients(id),
  created_at timestamptz default now()
);

insert into market_intelligence.report_products (report_type, display_name, description, price_nad) values
  ('suburb_report', 'Suburb Report', 'Full intelligence for one suburb (PDF + raw data)', 2500),
  ('city_overview', 'City Overview Report', 'All suburbs aggregated, Windhoek-wide', 8500),
  ('lender_risk_pack', 'Lender Risk Pack', 'Neighbourhood on-time rates + income-to-rent ratios for underwriters', 4200),
  ('development_feasibility', 'Development Feasibility Pack', 'Verified rent ranges + trend for target suburb', 5500)
on conflict (report_type) do nothing;

insert into market_intelligence.b2b_clients (name, client_type, access_tier, subscription_status, reports_pulled_this_month, rate_limit_per_hour) values
  ('First National Bank Namibia', 'Bank', 'API access', 'active', 12, 500),
  ('Namibia Property Developments', 'Developer', 'Monthly subscription', 'active', 4, 200),
  ('Windhoek Estate Collective', 'Estate Agent', 'One-time report', 'active', 2, 50)
on conflict do nothing;
