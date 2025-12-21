import { Context, Next } from 'hono';
import { getEnvVar } from '../lib/supabase';

export async function securityHeaders(c: Context, next: Next) {
  await next();

  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  const maxAge = getEnvVar('HSTS_MAX_AGE');
  if (maxAge) {
    c.header('Strict-Transport-Security', `max-age=${maxAge}; includeSubDomains`);
  }
}
