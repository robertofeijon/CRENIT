/* 0020_core_extensions: KYC, escrow, lease agreements, payment history */

-- 1) Dedicated KYC table (separate verification lifecycle details)
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')) DEFAULT 'NOT_SUBMITTED',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  identity_number TEXT,
  verification_provider TEXT,
  provider_reference TEXT,
  verified_name TEXT,
  verified_dob DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_profile_id ON public.kyc_verifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON public.kyc_verifications(status);

-- 2) Dedicated escrow tables
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES public.landlord_profiles(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'NAD',
  total_held NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_released NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_refunded NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_disputed NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('HELD', 'PARTIALLY_RELEASED', 'RELEASED', 'DISPUTED', 'CLOSED')) DEFAULT 'HELD',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deposit_id)
);

CREATE INDEX IF NOT EXISTS idx_escrow_accounts_deposit_id ON public.escrow_accounts(deposit_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_tenant_id ON public.escrow_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_landlord_id ON public.escrow_accounts(landlord_id);

CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_account_id UUID NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  deposit_id UUID NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'HOLD',
      'RELEASE_TO_TENANT',
      'RELEASE_TO_LANDLORD',
      'REFUND',
      'DISPUTE_OPENED',
      'DISPUTE_RESOLVED',
      'ADJUSTMENT'
    )
  ),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')) DEFAULT 'COMPLETED',
  reference TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_account_id ON public.escrow_transactions(escrow_account_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_deposit_id ON public.escrow_transactions(deposit_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_dispute_id ON public.escrow_transactions(dispute_id);

-- 3) Payment history event table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  landlord_id UUID REFERENCES public.landlord_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  payment_status TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('TENANT', 'LANDLORD', 'SYSTEM', 'ADMIN', 'WEBHOOK')) DEFAULT 'SYSTEM',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON public.payment_history(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_tenant_id ON public.payment_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_lease_id ON public.payment_history(lease_id);

-- 4) Lease agreements as separate records/documents
CREATE TABLE IF NOT EXISTS public.lease_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  landlord_profile_id UUID REFERENCES public.landlord_profiles(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('LEASE_AGREEMENT', 'ADDENDUM', 'RENEWAL', 'TERMINATION', 'OTHER')) DEFAULT 'LEASE_AGREEMENT',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  signature_status TEXT NOT NULL CHECK (signature_status IN ('DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'REJECTED')) DEFAULT 'DRAFT',
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_for_landlord_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lease_id, version)
);

CREATE INDEX IF NOT EXISTS idx_lease_agreements_lease_id ON public.lease_agreements(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_landlord_profile_id ON public.lease_agreements(landlord_profile_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_tenant_id ON public.lease_agreements(tenant_id);

-- 5) Extend attachments for lease/unit linkage and on-behalf uploads
ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS uploaded_for_landlord_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS source_role TEXT CHECK (source_role IN ('LANDLORD', 'ADMIN', 'SYSTEM')) DEFAULT 'LANDLORD';

CREATE INDEX IF NOT EXISTS idx_attachments_lease_id ON public.attachments(lease_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_for_landlord_id ON public.attachments(uploaded_for_landlord_id);

-- 6) RLS enablement for new sensitive tables
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_agreements ENABLE ROW LEVEL SECURITY;

-- KYC verification policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kyc_verifications' AND policyname = 'Users can view own kyc verification'
  ) THEN
    CREATE POLICY "Users can view own kyc verification"
      ON public.kyc_verifications FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kyc_verifications' AND policyname = 'Admins can manage kyc verification'
  ) THEN
    CREATE POLICY "Admins can manage kyc verification"
      ON public.kyc_verifications FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'));
  END IF;
END $$;
