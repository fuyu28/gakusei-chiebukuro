import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { getAuthCookieName } from './auth-cookie';

export function getAuthToken(c: Context): string | undefined {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieToken = getCookie(c, getAuthCookieName());
  return cookieToken || undefined;
}
