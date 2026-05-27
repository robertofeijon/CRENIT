const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'ADMIN_EMAILS',
  'EMAIL_PROVIDER_API_KEY',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
];

export function validateRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.toString().trim());
  if (!missing.length) return;
  const message = `Missing required environment variables: ${missing.join(', ')}`;
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}
