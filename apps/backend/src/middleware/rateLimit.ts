// T-066 API-004 API-007 API-008 Fixed-window request limiter per IP, in memory (no library)
import type { RequestHandler } from 'express';

import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  name: string;
}

const stores = new Map<string, Map<string, Bucket>>();
// In tests the limiter is off (many requests from one IP) until a test turns it on.
let enabled = env.NODE_ENV !== 'test';

// Turns limiting on/off and clears all counters (used by tests).
export function setRateLimitEnabled(value: boolean): void {
  enabled = value;
  for (const hits of stores.values()) hits.clear();
}

export function rateLimit({ windowMs, max, name }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, Bucket>();
  stores.set(name, hits);
  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of hits) if (bucket.resetAt <= now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    if (!enabled) {
      next();
      return;
    }
    const now = Date.now();
    const ip = req.ip ?? 'unknown';
    let bucket = hits.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(ip, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      next(
        new AppError('RATE_LIMITED', 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.', 429, {
          retryAfterSec,
        }),
      );
      return;
    }
    next();
  };
}
