create table if not exists market_intelligence.api_usage_log (
  id uuid default gen_random_uuid() primary key,
  key_id uuid references market_intelligence.api_keys(id) on delete set null,
  client_id uuid references market_intelligence.b2b_clients(id) on delete set null,
  endpoint text not null,
  method text not null default 'GET',
  response_status integer,
  created_at timestamptz default now()
);

alter table market_intelligence.api_keys
  add column if not exists expires_at timestamptz,
  add column if not exists grace_expires_at timestamptz,
  add column if not exists tier text default 'Subscription';

create index if not exists idx_api_usage_log_key_id
  on market_intelligence.api_usage_log(key_id);

create index if not exists idx_api_usage_log_client_id_created_at
  on market_intelligence.api_usage_log(client_id, created_at desc);
