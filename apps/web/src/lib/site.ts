/** Public site URL for metadata, sitemap, and canonical links. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    const withProtocol = fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`;
    return withProtocol.replace(/\/$/, '');
  }
  return 'http://localhost:3002';
}

export const SITE_NAME = 'CRENIT';

export const SITE_DESCRIPTION =
  'CRENIT turns verified rent payments into credit history, landlord portfolio tools, and licensed rental market intelligence in Namibia.';

export const MARKETING_SLUGS = [
  'products/rent-payments',
  'products/credit-score',
  'products/deposit-management',
  'products/market-data',
  'solutions/for-tenants',
  'solutions/for-landlords',
  'solutions/for-banks-lenders',
  'solutions/for-developers',
  'company/about-us',
  'company/how-it-works',
  'company/contact',
  'company/privacy',
  'company/terms',
] as const;

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'hello@crenit.com';
