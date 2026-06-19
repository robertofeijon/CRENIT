import type { Request } from 'express';

/** Best-effort client IP for fraud signals (respects common proxy headers). */
export function extractClientIp(req: Pick<Request, 'headers' | 'ip'>): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  return req.ip || null;
}

export function extractUserAgent(req: Pick<Request, 'headers'>): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' && ua.trim() ? ua.trim() : null;
}
