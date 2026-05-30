-- OPTIONAL — only run if you have permission (Supabase SQL Editor as postgres).
-- If you get "must be owner of table objects", skip this file and use the Dashboard instead:
--   Storage → [bucket] → Policies → remove all policies for kyc-documents & landlord-attachments
--
-- Private bucket + zero policies = no direct client access (service_role API + signed URLs only).

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        COALESCE(qual::text, '') ILIKE '%kyc-documents%'
        OR COALESCE(with_check::text, '') ILIKE '%kyc-documents%'
        OR COALESCE(qual::text, '') ILIKE '%landlord-attachments%'
        OR COALESCE(with_check::text, '') ILIKE '%landlord-attachments%'
        OR policyname ILIKE '%kyc%'
        OR policyname ILIKE '%landlord%attachment%'
        OR policyname ILIKE 'crenit_%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    RAISE NOTICE 'Dropped storage policy: %', pol.policyname;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "crenit_kyc_no_direct_client_access" ON storage.objects;
CREATE POLICY "crenit_kyc_no_direct_client_access"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'kyc-documents' AND false)
  WITH CHECK (bucket_id = 'kyc-documents' AND false);

DROP POLICY IF EXISTS "crenit_landlord_attachments_no_direct_client_access" ON storage.objects;
CREATE POLICY "crenit_landlord_attachments_no_direct_client_access"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'landlord-attachments' AND false)
  WITH CHECK (bucket_id = 'landlord-attachments' AND false);
