DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_approval_status') THEN
    CREATE TYPE partner_approval_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');
  END IF;
END $$;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS partner_approval_status partner_approval_status;

UPDATE profiles
SET partner_approval_status = CASE
  WHEN role = 'LANDLORD' THEN 'APPROVED'::partner_approval_status
  ELSE 'APPROVED'::partner_approval_status
END
WHERE partner_approval_status IS NULL;

ALTER TABLE profiles
ALTER COLUMN partner_approval_status SET DEFAULT 'APPROVED';

ALTER TABLE leases
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'PLATFORM';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leases_payment_method_check'
  ) THEN
    ALTER TABLE leases
    ADD CONSTRAINT leases_payment_method_check
    CHECK (payment_method IN ('PLATFORM', 'DIRECT'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS partner_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) NOT NULL,
  consent_text_version VARCHAR(20) NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS landlord_onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) NOT NULL,
  full_legal_name TEXT NOT NULL,
  business_name TEXT,
  registration_number TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  id_document_path TEXT NOT NULL,
  ownership_document_path TEXT NOT NULL,
  properties_intended INTEGER NOT NULL DEFAULT 1,
  tenants_estimated INTEGER NOT NULL DEFAULT 1,
  status partner_approval_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS lease_payment_method_switch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) NOT NULL,
  requested_by UUID REFERENCES profiles(id) NOT NULL,
  requested_method VARCHAR(20) NOT NULL CHECK (requested_method IN ('PLATFORM', 'DIRECT')),
  landlord_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_reference VARCHAR(20) UNIQUE NOT NULL,
  tenant_id UUID REFERENCES profiles(id) NOT NULL,
  score INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score_calculation_date TIMESTAMPTZ,
  verified_payment_records INTEGER NOT NULL DEFAULT 0,
  tenancy_months INTEGER NOT NULL DEFAULT 0
);
