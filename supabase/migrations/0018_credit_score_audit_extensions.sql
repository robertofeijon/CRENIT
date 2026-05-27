alter table public.credit_scores
  add column if not exists anomaly_flag boolean default false,
  add column if not exists anomaly_note text,
  add column if not exists overridden boolean default false,
  add column if not exists override_reason text;

alter table public.score_history
  add column if not exists event_type text default 'CALCULATED',
  add column if not exists event_reason text;
