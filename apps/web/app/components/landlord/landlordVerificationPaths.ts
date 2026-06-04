/** Routes that require partner verification (VERIFIED / APPROVED). */
export const LANDLORD_VERIFICATION_LOCKED_PREFIXES = [
  '/landlord/properties',
  '/landlord/tenants',
  '/landlord/leases',
  '/landlord/deposits',
  '/landlord/payments',
  '/landlord/reports',
  '/landlord/market-data',
  '/landlord/attachments',
] as const;

export const LANDLORD_VERIFICATION_LOCK_REASON = 'Complete verification to unlock';

export function isLandlordVerificationLockedPath(pathname: string): boolean {
  return LANDLORD_VERIFICATION_LOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
