import { Context, Next } from 'hono';
import { HTTP_STATUS } from '../constants/http';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin);
}

function isRefererAllowed(referer: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((origin) => referer.startsWith(origin));
}

export function createCsrfMiddleware(allowedOrigins: string[]) {
  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();
    if (SAFE_METHODS.has(method)) {
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');
    const hasBearer = authHeader?.startsWith('Bearer ');
    const hasCookie = Boolean(c.req.header('Cookie'));

    if (!hasCookie || hasBearer) {
      await next();
      return;
    }

    const origin = c.req.header('Origin');
    const referer = c.req.header('Referer');

    const allowed =
      (origin ? isOriginAllowed(origin, allowedOrigins) : false) ||
      (referer ? isRefererAllowed(referer, allowedOrigins) : false);

    if (!allowed) {
      return c.json({ error: 'CSRF blocked' }, HTTP_STATUS.FORBIDDEN);
    }

    await next();
  };
}
