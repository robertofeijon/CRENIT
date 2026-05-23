ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_kyc_status_check
  CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'NOT_SUBMITTED'));

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  provider TEXT,
  payload JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
