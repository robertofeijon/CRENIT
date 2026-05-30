-- Private storage buckets (safe to run in Supabase SQL Editor)
--
-- Does NOT alter storage.objects or create RLS policies here — that requires
-- the table owner and often fails with: "must be owner of table objects".
--
-- After this migration:
-- 1. Confirm buckets show Public OFF in Dashboard → Storage
-- 2. For each bucket, open Policies and DELETE any allow rules for anon/authenticated
--    (no policies + private bucket = clients cannot access; API uses service_role + signed URLs)
--
-- Optional policy SQL (postgres only): see 0025_storage_policies_optional.sql

-- Create or update buckets — always private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'kyc-documents',
    'kyc-documents',
    false,
    8388608,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/octet-stream'
    ]::text[]
  ),
  (
    'landlord-attachments',
    'landlord-attachments',
    false,
    10485760,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream'
    ]::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = false
WHERE id IN ('kyc-documents', 'landlord-attachments');
