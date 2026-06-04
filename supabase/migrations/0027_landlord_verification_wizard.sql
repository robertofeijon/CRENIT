-- Landlord dashboard KYC wizard fields and status values

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_approval_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_partner_approval_status_check
  CHECK (
    partner_approval_status IN (
      'UNVERIFIED',
      'PENDING_APPROVAL',
      'PENDING_REVIEW',
      'APPROVED',
      'REJECTED',
      'SUSPENDED'
    )
  );

ALTER TABLE public.landlord_profiles
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS properties_managed_count integer,
  ADD COLUMN IF NOT EXISTS ownership_status text,
  ADD COLUMN IF NOT EXISTS landlord_kyc_draft jsonb;

COMMENT ON COLUMN public.landlord_profiles.landlord_kyc_draft IS 'Auto-saved landlord KYC wizard progress (steps 1-3)';
