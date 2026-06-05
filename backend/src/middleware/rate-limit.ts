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

// NOTE: インメモリストアのため Cloudflare Workers の複数インスタンス間では
// カウントが共有されない。厳密な分散レート制限が必要な場合は
// Cloudflare KV / Durable Objects への移行を検討すること。
const store = new Map<string, RateEntry>();
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX = 20;
const CLEANUP_INTERVAL = 50;
let requestCount = 0;

function purgeExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

function getClientIp(c: Context): string {
  // CF-Connecting-IP はCloudflareが付与するため信頼できる。
  // X-Forwarded-For / X-Real-IP はクライアントが偽造可能なため使用しない。
  const cf = c.req.header('CF-Connecting-IP');
  if (cf) return cf;
  return 'unknown';
}

export function createRateLimitMiddleware(options?: Partial<RateLimitOptions>) {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options?.max ?? DEFAULT_MAX;
  const keyPrefix = options?.keyPrefix ?? 'auth';

  return async (c: Context, next: Next) => {
    requestCount += 1;
    if (requestCount % CLEANUP_INTERVAL === 0) purgeExpiredEntries();

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
