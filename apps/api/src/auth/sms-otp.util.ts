import { createHash, randomInt } from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;

export function generateSmsOtp(): string {
  return String(randomInt(100_000, 1_000_000));
}

function otpPepper(): string {
  return process.env.JWT_SECRET || process.env.SMS_OTP_PEPPER || 'crenit-dev-otp-pepper';
}

export function hashSmsOtp(userId: string, otp: string): string {
  return createHash('sha256').update(`${userId}:${otp}:${otpPepper()}`).digest('hex');
}

export function verifySmsOtp(userId: string, otp: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !otp) return false;
  return hashSmsOtp(userId, otp.trim()) === storedHash;
}

export function smsOtpExpiresAt(): string {
  return new Date(Date.now() + OTP_TTL_MS).toISOString();
}

export function isSmsOtpExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return Date.parse(expiresAt) < Date.now();
}
