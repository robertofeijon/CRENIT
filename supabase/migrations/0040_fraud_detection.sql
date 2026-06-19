-- Fraud pattern flags + payment client context for self-dealing detection

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS confirm_client_ip TEXT,
  ADD COLUMN IF NOT EXISTS confirm_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS eft_proof_client_ip TEXT,
  ADD COLUMN IF NOT EXISTS eft_proof_user_agent TEXT;

CREATE TABLE IF NOT EXISTS public.platform_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type TEXT NOT NULL CHECK (
    flag_type IN ('CONFIRM_RATE_ANOMALY', 'SELF_DEALING_PATTERN', 'LOCATION_MISMATCH')
  ),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'FLAGGED' CHECK (
    status IN ('FLAGGED', 'UNDER_REVIEW', 'RESOLVED', 'SUSPENDED')
  ),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  flag_note TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_note TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_fraud_flags_active_unique
  ON public.platform_fraud_flags (
    flag_type,
    user_id,
    COALESCE(related_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status IN ('FLAGGED', 'UNDER_REVIEW');

CREATE INDEX IF NOT EXISTS idx_platform_fraud_flags_status
  ON public.platform_fraud_flags (status, flagged_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_fraud_flags_user
  ON public.platform_fraud_flags (user_id);
