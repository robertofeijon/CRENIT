/** Base URL for public PDF verification links (supports verify.crenit.na subdomain). */
export function getVerifyBaseUrl(): string {
  const dedicated = process.env.NEXT_PUBLIC_VERIFY_URL?.trim();
  if (dedicated) {
    return dedicated.replace(/\/$/, '');
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    return `${site.replace(/\/$/, '')}/verify`;
  }
  return 'http://localhost:3002/verify';
}

export function buildVerifyUrl(reference: string): string {
  const base = getVerifyBaseUrl();
  const encoded = encodeURIComponent(reference);
  return base.endsWith('/verify') ? `${base}/${encoded}` : `${base}/verify/${encoded}`;
}
