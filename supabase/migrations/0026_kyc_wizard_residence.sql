-- KYC 3-step wizard: personal/residence fields, proof of address, landlord tenant residence, PENDING_REVIEW

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS address_region text,
  ADD COLUMN IF NOT EXISTS residential_status text,
  ADD COLUMN IF NOT EXISTS kyc_wizard_draft jsonb;

ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS tenant_residence jsonb;

COMMENT ON COLUMN public.leases.tenant_residence IS 'Landlord-reported tenant residence for KYC cross-verification (tenant does not see this)';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_kyc_status_check
  CHECK (kyc_status IN ('PENDING', 'PENDING_REVIEW', 'VERIFIED', 'APPROVED', 'REJECTED', 'NOT_SUBMITTED'));

-- Extend kyc_documents doc_type (drop/recreate check if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kyc_documents_doc_type_check'
      AND conrelid = 'public.kyc_documents'::regclass
  ) THEN
    ALTER TABLE public.kyc_documents DROP CONSTRAINT kyc_documents_doc_type_check;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.kyc_documents
  ADD CONSTRAINT kyc_documents_doc_type_check
  CHECK (
    doc_type IN (
      'NATIONAL_ID_FRONT',
      'NATIONAL_ID_BACK',
      'SELFIE',
      'PROOF_OF_INCOME',
      'PROOF_OF_ADDRESS',
      'BANK_STATEMENT',
      'EMPLOYER_LETTER',
      'LEASE_AGREEMENT'
    )
  );
