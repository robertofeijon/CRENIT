-- Post-apply verification for staging migrations 0035–0045
-- Run in Supabase SQL Editor after applying staging_apply_reference.sql

-- 0035 notifications
SELECT EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
) AS notifications_on_realtime;

-- 0036 phase 1 trust
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments'
  AND column_name IN ('auto_confirm_at', 'confirmed_via', 'confirmation_reminder_sent_at');

-- 0037 waitlist
SELECT to_regclass('public.tenant_waitlist') IS NOT NULL AS tenant_waitlist;

-- 0039 email delivery
SELECT to_regclass('public.email_delivery_log') IS NOT NULL AS email_delivery_log;

-- 0040 fraud
SELECT to_regclass('public.platform_fraud_flags') IS NOT NULL AS platform_fraud_flags;

-- 0041 score narrative
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'score_history'
  AND column_name IN ('event_reason', 'score_delta');

-- 0042 multi-lease metadata
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'score_history'
  AND column_name = 'metadata';

-- 0043 B2B demo
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'market_data_snapshots'
  AND column_name = 'is_illustrative';

-- 0044 phase 2 tail
SELECT to_regclass('public.onboarding_email_enrollments') IS NOT NULL AS onboarding_emails;
SELECT to_regclass('public.payment_history_imports') IS NOT NULL AS payment_history_imports;
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name = 'landlord_tier';

-- 0045 SMS 2FA
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('two_factor_method', 'sms_otp_hash');

-- confirmed_via includes IMPORT
SELECT pg_get_constraintdef(oid) AS confirmed_via_check
FROM pg_constraint
WHERE conname = 'payments_confirmed_via_check';
