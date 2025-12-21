import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { HTTP_STATUS } from '../constants/http';
import { getCsrfCookieName, getCsrfHeaderName } from '../lib/csrf';
import { getAuthCookieName } from '../lib/auth-cookie';

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
    const hasAuthCookie = Boolean(getCookie(c, getAuthCookieName()));

    if (!hasAuthCookie || hasBearer) {
      await next();
      return;
    }

    const csrfHeader = c.req.header(getCsrfHeaderName());
    const csrfCookie = getCookie(c, getCsrfCookieName());
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return c.json({ error: 'CSRF token mismatch' }, HTTP_STATUS.FORBIDDEN);
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
