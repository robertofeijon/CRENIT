-- Align kyc_documents with admin/KYC service expectations (0001 table may exist without these columns)
ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';

ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
