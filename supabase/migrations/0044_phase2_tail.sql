-- Phase 2 tail: lite landlord tier, onboarding email enrollments, retrospective payment import

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS landlord_tier TEXT CHECK (landlord_tier IS NULL OR landlord_tier IN ('LITE', 'FULL'));

CREATE TABLE IF NOT EXISTS public.onboarding_email_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('TENANT', 'LANDLORD')),
  sequence_key TEXT NOT NULL,
  next_step_index INT NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_email_due
  ON public.onboarding_email_enrollments (next_send_at)
  WHERE completed_at IS NULL AND opted_out_at IS NULL;

CREATE TABLE IF NOT EXISTS public.payment_history_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  source_filename TEXT,
  row_count INT NOT NULL DEFAULT 0,
  approved_count INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_history_imports_tenant
  ON public.payment_history_imports (tenant_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_history_import_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.payment_history_imports(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  period_month DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  bank_reference TEXT,
  on_time BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_history_import_entries_import
  ON public.payment_history_import_entries (import_id, row_number);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_confirmed_via_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_confirmed_via_check
  CHECK (confirmed_via IS NULL OR confirmed_via IN ('MANUAL', 'AUTO', 'TOKEN_LINK', 'IMPORT'));
