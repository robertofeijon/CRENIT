/** Parse CORS_ORIGIN env (comma-separated). Strips trailing slashes. */
export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return ['http://localhost:3000', 'http://localhost:3002'];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function createCorsOriginValidator(allowed: string[]) {
  const set = new Set(allowed);
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = origin.replace(/\/$/, '');
    callback(null, set.has(normalized));
  };
}
