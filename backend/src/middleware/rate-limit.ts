import { Context, Next } from 'hono';
import { HTTP_STATUS } from '../constants/http';
type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateEntry>();
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX = 20;

function getClientIp(c: Context): string {
  const cf = c.req.header('CF-Connecting-IP');
  if (cf) return cf;
  const xff = c.req.header('X-Forwarded-For');
  if (xff) return xff.split(',')[0]?.trim() || xff;
  const realIp = c.req.header('X-Real-IP');
  if (realIp) return realIp;
  return 'unknown';
}

export function createRateLimitMiddleware(options?: Partial<RateLimitOptions>) {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options?.max ?? DEFAULT_MAX;
  const keyPrefix = options?.keyPrefix ?? 'auth';

  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const now = Date.now();
    const key = `${keyPrefix}:${ip}`;
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Too many requests' }, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    await next();
  };
}
