/** App segments wrapped by AuthScopeLayout (see tenant/landlord/admin/auth/join layouts). */
export const AUTH_SCOPED_PREFIXES = ['/tenant', '/landlord', '/admin', '/auth', '/join'] as const;

export function isAuthScopedPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return AUTH_SCOPED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
