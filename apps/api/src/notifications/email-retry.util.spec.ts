import { describe, expect, it } from 'vitest';
import { emailStatusAfterFailure, nextEmailRetryAt, validateEmailConfiguration } from './email-retry.util';

describe('validateEmailConfiguration', () => {
  it('flags missing SMTP credentials', () => {
    const result = validateEmailConfiguration({ EMAIL_PROVIDER: 'smtp' });
    expect(result.configured).toBe(false);
    expect(result.issues.some((i) => i.code === 'SMTP_USER_MISSING')).toBe(true);
    expect(result.issues.some((i) => i.code === 'SMTP_PASS_MISSING')).toBe(true);
  });

  it('passes when SMTP is fully configured', () => {
    const result = validateEmailConfiguration({
      EMAIL_PROVIDER: 'smtp',
      SMTP_USER: 'user@gmail.com',
      SMTP_PASS: 'secret',
      SMTP_HOST: 'smtp.gmail.com',
    });
    expect(result.configured).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'critical')).toHaveLength(0);
  });
});

describe('nextEmailRetryAt', () => {
  it('returns null after max retry schedule', () => {
    expect(nextEmailRetryAt(6)).toBeNull();
  });

  it('schedules first retry 5 minutes out', () => {
    const from = new Date('2026-06-01T12:00:00Z');
    const next = nextEmailRetryAt(1, from);
    expect(next?.toISOString()).toBe('2026-06-01T12:05:00.000Z');
  });
});

describe('emailStatusAfterFailure', () => {
  it('marks dead after max attempts', () => {
    expect(emailStatusAfterFailure(5, 5)).toBe('DEAD');
    expect(emailStatusAfterFailure(3, 5)).toBe('FAILED');
  });
});
