-- Webhook delivery retries (exponential backoff)

alter table market_intelligence.webhook_deliveries
  add column if not exists attempt_count integer not null default 1,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text;

create index if not exists idx_webhook_deliveries_pending_retry
  on market_intelligence.webhook_deliveries (next_retry_at)
  where next_retry_at is not null;
