import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

type Entry = { count: number; resetAt: number };

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly cache = new Map<string, Entry>();
  private readonly windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  private readonly maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);

  use(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const key = `${ip}:${req.path}`;
    const record = this.cache.get(key);

    if (!record || now > record.resetAt) {
      this.cache.set(key, { count: 1, resetAt: now + this.windowMs });
      return next();
    }

    record.count += 1;
    this.cache.set(key, record);

    if (record.count > this.maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        success: false,
        data: null,
        error: `Rate limit exceeded. Retry in ${retryAfter} seconds.`,
      });
      return;
    }

    next();
  }
}
