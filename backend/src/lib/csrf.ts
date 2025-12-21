import type { CookieOptions } from 'hono/utils/cookie';
import { getEnvVar } from './supabase';

export function getCsrfCookieName(): string {
  return getEnvVar('CSRF_COOKIE_NAME') || 'csrf_token';
}

export function getCsrfHeaderName(): string {
  return getEnvVar('CSRF_HEADER_NAME') || 'X-CSRF-Token';
}

export function getCsrfCookieOptions(): CookieOptions {
  const secureEnv = getEnvVar('AUTH_COOKIE_SECURE');
  const isSecure = secureEnv ? secureEnv !== 'false' : getEnvVar('NODE_ENV') === 'production';
  const domain = getEnvVar('AUTH_COOKIE_DOMAIN');
  const sameSiteRaw = (getEnvVar('AUTH_COOKIE_SAMESITE') || 'lax').toLowerCase();
  const sameSite = sameSiteRaw === 'none' ? 'None' : sameSiteRaw === 'strict' ? 'Strict' : 'Lax';
  const secure = sameSite === 'None' ? true : isSecure;

  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export function createCsrfToken(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
