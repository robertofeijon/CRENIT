const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'ADMIN_EMAILS',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
];

const isProduction = () => process.env.NODE_ENV === 'production';

export function validateRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.toString().trim());

  const emailProvider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  if (emailProvider === 'smtp') {
    if (!process.env.SMTP_USER?.trim()) {
      // eslint-disable-next-line no-console
      console.warn('[email] SMTP_USER is not set — transactional email will be disabled until configured.');
    }
  } else if (!process.env.EMAIL_PROVIDER_API_KEY?.trim()) {
    missing.push('EMAIL_PROVIDER_API_KEY');
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() ?? '';
  if (jwtSecret && jwtSecret.length < 32 && isProduction()) {
    // eslint-disable-next-line no-console
    console.error('JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
  }

  if (isProduction() && !process.env.WEB_URL?.trim() && !process.env.APP_URL?.trim()) {
    // eslint-disable-next-line no-console
    console.warn('[deploy] Set WEB_URL or APP_URL to your Vercel URL for emails and report verify links.');
  }

  if (!missing.length) {
    if (emailProvider === 'smtp' && !process.env.SMTP_PASS?.trim()) {
      // eslint-disable-next-line no-console
      console.warn(
        '[email] SMTP_PASS is not set — emails will log as [email-dev] until you add a Gmail App Password.',
      );
    }
    return;
  }

  const message = `Missing required environment variables: ${missing.join(', ')}`;
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}
