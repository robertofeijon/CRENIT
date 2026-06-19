/** Server-side verify link builder — prefers VERIFY_URL then WEB_URL/verify. */
export function buildVerifyUrl(reference: string): string {
  const dedicated = (process.env.VERIFY_URL || process.env.NEXT_PUBLIC_VERIFY_URL || '').trim();
  const base = dedicated
    ? dedicated.replace(/\/$/, '')
    : `${(process.env.WEB_URL || process.env.APP_URL || 'http://localhost:3002').replace(/\/$/, '')}/verify`;
  const encoded = encodeURIComponent(reference);
  return base.endsWith('/verify') ? `${base}/${encoded}` : `${base}/verify/${encoded}`;
}
