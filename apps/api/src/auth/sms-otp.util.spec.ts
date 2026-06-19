import { describe, expect, it } from 'vitest';
import { generateSmsOtp, hashSmsOtp, isSmsOtpExpired, smsOtpExpiresAt, verifySmsOtp } from './sms-otp.util';

describe('sms-otp.util', () => {
  it('generates six-digit codes', () => {
    const otp = generateSmsOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('verifies hashed OTP', () => {
    const userId = 'user-1';
    const otp = '123456';
    const hash = hashSmsOtp(userId, otp);
    expect(verifySmsOtp(userId, otp, hash)).toBe(true);
    expect(verifySmsOtp(userId, '000000', hash)).toBe(false);
  });

  it('detects expiry', () => {
    expect(isSmsOtpExpired(smsOtpExpiresAt())).toBe(false);
    expect(isSmsOtpExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });
});
