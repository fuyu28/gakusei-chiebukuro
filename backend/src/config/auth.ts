import { getEnvVar } from '../lib/supabase';

type AuthConfig = {
  requireEmailVerification: boolean;
  emailRedirectTo?: string;
  returnAccessToken: boolean;
  rateLimit: {
    windowMs: number;
    max: number;
  };
};

const DEFAULT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 20;

function getEnvNumber(key: string, fallback: number): number {
  const value = getEnvVar(key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getAuthConfig(): AuthConfig {
  return {
    requireEmailVerification: getEnvVar('REQUIRE_EMAIL_VERIFICATION') !== 'false',
    emailRedirectTo: getEnvVar('EMAIL_REDIRECT_TO') || undefined,
    returnAccessToken: getEnvVar('RETURN_ACCESS_TOKEN') === 'true',
    rateLimit: {
      windowMs: getEnvNumber('AUTH_RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS),
      max: getEnvNumber('AUTH_RATE_LIMIT_MAX', DEFAULT_RATE_LIMIT_MAX),
    },
  };
}
