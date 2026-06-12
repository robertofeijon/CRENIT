-- Phase 1 trust: auto-confirm payments, shareable report expiry, dispute timeline

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS auto_confirm_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_via TEXT CHECK (confirmed_via IN ('MANUAL', 'AUTO', 'TOKEN_LINK')),
  ADD COLUMN IF NOT EXISTS confirmation_disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE public.report_verifications
  ADD COLUMN IF NOT EXISTS brand_tier VARCHAR(20),
  ADD COLUMN IF NOT EXISTS score_100 NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS dispute_type TEXT CHECK (
    dispute_type IN ('DAMAGE_CLAIM', 'UNPAID_UTILITIES', 'EARLY_EXIT', 'OTHER')
  );

CREATE TABLE IF NOT EXISTS public.dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_events_dispute_id ON public.dispute_events(dispute_id, created_at);

CREATE TABLE IF NOT EXISTS public.dispute_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  dispute_type TEXT,
  outcome TEXT NOT NULL,
  resolution_days INTEGER,
  landlord_favoured BOOLEAN,
  evidence_types JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_auto_confirm ON public.payments(auto_confirm_at)
  WHERE status IN ('PENDING', 'PROCESSING', 'OVERDUE') AND confirmation_disputed_at IS NULL;
