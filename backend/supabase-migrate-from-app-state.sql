-- One-time migration from legacy app_state JSON blobs into relational tables.
-- Run AFTER backend/supabase-state-schema.sql.
-- Safe to re-run due to upserts and conflict handling.

begin;

-- 1) Migrate users from app_state.users payload
with users_blob as (
  select payload
  from public.app_state
  where key = 'users'
), expanded_users as (
  select jsonb_array_elements(coalesce(payload->'users', '[]'::jsonb)) as u
  from users_blob
)
insert into public.users (
  id,
  full_name,
  email,
  role,
  password_hash,
  kyc_status,
  kyc_submitted_at,
  kyc_reviewed_at,
  kyc_review_note,
  reset_token,
  reset_token_expires_at,
  created_at,
  updated_at
)
select
  coalesce(u->>'id', 'USR-' || gen_random_uuid()::text),
  coalesce(u->>'fullName', 'Unknown User'),
  lower(coalesce(u->>'email', gen_random_uuid()::text || '@example.com')),
  coalesce(u->>'role', 'customer'),
  coalesce(u->>'passwordHash', ''),
  coalesce(u->>'kycStatus', 'not_submitted'),
  nullif(u->>'kycSubmittedAt', '')::timestamptz,
  nullif(u->>'kycReviewedAt', '')::timestamptz,
  nullif(u->>'kycReviewNote', ''),
  nullif(u->>'resetToken', ''),
  nullif(u->>'resetTokenExpiresAt', '')::timestamptz,
  coalesce(nullif(u->>'createdAt', '')::timestamptz, now()),
  coalesce(nullif(u->>'updatedAt', '')::timestamptz, now())
from expanded_users
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  password_hash = excluded.password_hash,
  kyc_status = excluded.kyc_status,
  kyc_submitted_at = excluded.kyc_submitted_at,
  kyc_reviewed_at = excluded.kyc_reviewed_at,
  kyc_review_note = excluded.kyc_review_note,
  reset_token = excluded.reset_token,
  reset_token_expires_at = excluded.reset_token_expires_at,
  updated_at = now();

-- 2) Migrate user sessions from users payload
with users_blob as (
  select payload
  from public.app_state
  where key = 'users'
), expanded_users as (
  select jsonb_array_elements(coalesce(payload->'users', '[]'::jsonb)) as u
  from users_blob
), expanded_sessions as (
  select
    u->>'id' as user_id,
    jsonb_array_elements(coalesce(u->'sessions', '[]'::jsonb)) as s
  from expanded_users
)
insert into public.user_sessions (
  id,
  user_id,
  user_agent,
  ip_address,
  created_at,
  last_active_at,
  revoked_at
)
select
  coalesce(s->>'id', 'SES-' || gen_random_uuid()::text),
  user_id,
  s->>'userAgent',
  s->>'ipAddress',
  coalesce(nullif(s->>'createdAt', '')::timestamptz, now()),
  coalesce(nullif(s->>'lastActiveAt', '')::timestamptz, now()),
  nullif(s->>'revokedAt', '')::timestamptz
from expanded_sessions
where user_id is not null
on conflict (id) do update
set
  user_agent = excluded.user_agent,
  ip_address = excluded.ip_address,
  last_active_at = excluded.last_active_at,
  revoked_at = excluded.revoked_at;

-- 3) Migrate audit events from app_state.auditLog payload
with log_blob as (
  select payload
  from public.app_state
  where key = 'auditLog'
), expanded_events as (
  select jsonb_array_elements(coalesce(payload->'events', '[]'::jsonb)) as e
  from log_blob
)
insert into public.audit_events (
  id,
  actor_user_id,
  actor_role,
  actor_email,
  action,
  details,
  at
)
select
  coalesce(e->>'id', 'AUD-' || gen_random_uuid()::text),
  nullif(e->'actor'->>'id', ''),
  nullif(e->'actor'->>'role', ''),
  nullif(e->'actor'->>'email', ''),
  coalesce(e->>'action', 'unknown_action'),
  coalesce(e->'details', '{}'::jsonb),
  coalesce(nullif(e->>'at', '')::timestamptz, now())
from expanded_events
on conflict (id) do update
set
  actor_user_id = excluded.actor_user_id,
  actor_role = excluded.actor_role,
  actor_email = excluded.actor_email,
  action = excluded.action,
  details = excluded.details,
  at = excluded.at;

-- 4) Migrate tenant-centric data from app_state.tenantData payload
-- This migration stores data into normalized high-value tables first.
with tenant_blob as (
  select payload
  from public.app_state
  where key = 'tenantData'
), pairs as (
  select key as tenant_id, value as tenant_payload
  from tenant_blob,
  lateral jsonb_each(coalesce(payload->'tenants', '{}'::jsonb))
)
insert into public.credit_snapshots (
  id,
  tenant_id,
  score,
  tier,
  on_time_percentage,
  late_payment_count,
  payment_streak,
  report_url,
  report_share_link,
  captured_at,
  metadata
)
select
  'CRD-' || tenant_id,
  tenant_id,
  nullif(tenant_payload->'credit'->>'currentScore', '')::int,
  tenant_payload->'credit'->>'tier',
  nullif(tenant_payload->'credit'->>'onTimePercentage', '')::numeric,
  nullif(tenant_payload->'credit'->>'latePaymentCount', '')::int,
  nullif(tenant_payload->'credit'->>'paymentStreak', '')::int,
  tenant_payload->'credit'->>'reportUrl',
  tenant_payload->'credit'->>'reportShareLink',
  now(),
  coalesce(tenant_payload->'credit', '{}'::jsonb)
from pairs
where exists (select 1 from public.users u where u.id = tenant_id)
on conflict (id) do update
set
  score = excluded.score,
  tier = excluded.tier,
  on_time_percentage = excluded.on_time_percentage,
  late_payment_count = excluded.late_payment_count,
  payment_streak = excluded.payment_streak,
  report_url = excluded.report_url,
  report_share_link = excluded.report_share_link,
  metadata = excluded.metadata,
  captured_at = now();

-- 5) Migrate payment history into normalized payments table
with tenant_blob as (
  select payload
  from public.app_state
  where key = 'tenantData'
), pairs as (
  select key as tenant_id, value as tenant_payload
  from tenant_blob,
  lateral jsonb_each(coalesce(payload->'tenants', '{}'::jsonb))
), pay_rows as (
  select
    tenant_id,
    jsonb_array_elements(coalesce(tenant_payload->'payments'->'history', '[]'::jsonb)) as p
  from pairs
)
insert into public.payments (
  id,
  tenant_id,
  amount,
  status,
  category,
  label,
  due_date,
  paid_at,
  receipt_url,
  metadata
)
select
  coalesce(p->>'id', 'PAY-' || gen_random_uuid()::text),
  tenant_id,
  coalesce(nullif(p->>'amount', '')::numeric, 0),
  case
    when p->>'status' in ('pending', 'paid', 'failed', 'refunded') then p->>'status'
    else 'pending'
  end,
  'rent',
  coalesce(p->>'label', 'Rent payment'),
  nullif(p->>'date', '')::date,
  nullif(p->>'date', '')::timestamptz,
  p->>'receiptUrl',
  p
from pay_rows
where exists (select 1 from public.users u where u.id = tenant_id)
on conflict (id) do update
set
  amount = excluded.amount,
  status = excluded.status,
  label = excluded.label,
  due_date = excluded.due_date,
  paid_at = excluded.paid_at,
  receipt_url = excluded.receipt_url,
  metadata = excluded.metadata,
  updated_at = now();

commit;
