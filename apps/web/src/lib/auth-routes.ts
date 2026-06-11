const AUTH_REQUIRED_PREFIXES = ['/tenant', '/landlord', '/admin', '/auth', '/join', '/dashboard'] as const;

/** Routes that need full session hydration and /auth/me profile lookup. */
export function isAuthRequiredPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return AUTH_REQUIRED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
