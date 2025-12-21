import type { CookieOptions } from 'hono/utils/cookie';
import { getEnvVar } from './supabase';

export function getAuthCookieName(): string {
  return getEnvVar('AUTH_COOKIE_NAME') || 'auth_token';
}

function normalizeSameSite(value: string | undefined): CookieOptions['sameSite'] {
  const normalized = (value || 'lax').toLowerCase();
  if (normalized === 'strict') return 'Strict';
  if (normalized === 'none') return 'None';
  return 'Lax';
}

export function getAuthCookieOptions(expiresIn?: number): CookieOptions {
  const secureEnv = getEnvVar('AUTH_COOKIE_SECURE');
  const isSecure = secureEnv ? secureEnv !== 'false' : getEnvVar('NODE_ENV') === 'production';
  const domain = getEnvVar('AUTH_COOKIE_DOMAIN');
  const sameSite = normalizeSameSite(getEnvVar('AUTH_COOKIE_SAMESITE'));
  const maxAge = expiresIn && expiresIn > 0 ? expiresIn : undefined;
  const secure = sameSite === 'None' ? true : isSecure;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    ...(domain ? { domain } : {}),
    ...(maxAge ? { maxAge } : {}),
  };
}
