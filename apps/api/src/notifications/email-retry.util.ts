/** Exponential backoff for email retries: 5m, 15m, 1h, 4h, 24h */
const RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
];

export function nextEmailRetryAt(attemptCount: number, from = new Date()): Date | null {
  const index = Math.max(0, attemptCount - 1);
  if (index >= RETRY_DELAYS_MS.length) return null;
  return new Date(from.getTime() + RETRY_DELAYS_MS[index]);
}

export function emailStatusAfterFailure(attemptCount: number, maxAttempts: number): 'FAILED' | 'DEAD' {
  return attemptCount >= maxAttempts ? 'DEAD' : 'FAILED';
}

export type EmailConfigIssue = {
  code: string;
  message: string;
  severity: 'critical' | 'warning';
};

export function validateEmailConfiguration(env: NodeJS.ProcessEnv): {
  configured: boolean;
  provider: string;
  issues: EmailConfigIssue[];
} {
  const provider = (env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  const issues: EmailConfigIssue[] = [];

  if (provider === 'smtp') {
    if (!env.SMTP_USER?.trim()) {
      issues.push({ code: 'SMTP_USER_MISSING', message: 'SMTP_USER is not set', severity: 'critical' });
    }
    if (!env.SMTP_PASS?.trim()) {
      issues.push({ code: 'SMTP_PASS_MISSING', message: 'SMTP_PASS is not set', severity: 'critical' });
    }
    if (!env.SMTP_HOST?.trim()) {
      issues.push({ code: 'SMTP_HOST_MISSING', message: 'SMTP_HOST is not set — defaulting to smtp.gmail.com', severity: 'warning' });
    }
  } else {
    const key = env.EMAIL_PROVIDER_API_KEY?.trim();
    if (!key || key === 'dev-placeholder') {
      issues.push({
        code: 'EMAIL_API_KEY_MISSING',
        message: `EMAIL_PROVIDER_API_KEY is missing for provider ${provider}`,
        severity: 'critical',
      });
    }
  }

  if (!env.EMAIL_CONTACT?.trim() && !env.EMAIL_REPLY_TO?.trim() && !env.SMTP_USER?.trim()) {
    issues.push({
      code: 'CONTACT_EMAIL_MISSING',
      message: 'EMAIL_CONTACT / EMAIL_REPLY_TO not set — contact form routing may fail',
      severity: 'warning',
    });
  }

  const configured = !issues.some((i) => i.severity === 'critical');
  return { configured, provider, issues };
}
