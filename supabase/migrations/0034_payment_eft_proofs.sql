-- EFT proof-of-payment uploads (private bucket + payment columns)

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS eft_proof_storage_path text,
  ADD COLUMN IF NOT EXISTS eft_proof_file_name text,
  ADD COLUMN IF NOT EXISTS eft_proof_uploaded_at timestamptz;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'payment-proofs',
    'payment-proofs',
    false,
    5242880,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/octet-stream'
    ]::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';
