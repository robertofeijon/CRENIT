import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SIGNED_URL_TTL_SEC = 60 * 60;

/** Prefer signed URLs for private buckets (KYC, attachments). */
export async function createSignedStorageUrl(
  client: SupabaseClient,
  bucket: string,
  storagePath: string | null | undefined,
  expiresInSec = DEFAULT_SIGNED_URL_TTL_SEC,
): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(storagePath, expiresInSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function sanitizeStorageFileName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || 'upload';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload';
}
