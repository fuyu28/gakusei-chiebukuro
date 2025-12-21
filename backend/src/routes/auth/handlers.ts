import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { getSupabase, isAllowedEmailDomain } from '../../lib/supabase';
import { getAuthCookieName, getAuthCookieOptions } from '../../lib/auth-cookie';
import { createCsrfToken, getCsrfCookieName, getCsrfCookieOptions } from '../../lib/csrf';
import { getAuthConfig } from '../../config/auth';
import { ensureUserProfile } from '../../services/profiles';
import { AppError } from '../../utils/errors';
import { HTTP_STATUS } from '../../constants/http';
import type { AuthUser } from '../../types';

function setSessionCookies(c: Context, accessToken?: string | null, expiresIn?: number | null) {
  if (!accessToken) return;
  const maxAge = typeof expiresIn === 'number' ? expiresIn : undefined;
  setCookie(c, getAuthCookieName(), accessToken, getAuthCookieOptions(maxAge));
  setCookie(c, getCsrfCookieName(), createCsrfToken(), getCsrfCookieOptions());
}

function clearSessionCookies(c: Context) {
  deleteCookie(c, getAuthCookieName(), getAuthCookieOptions());
  deleteCookie(c, getCsrfCookieName(), getCsrfCookieOptions());
}

export async function signupHandler(c: Context) {
  const supabase = getSupabase();
  const { email, password, display_name } = c.req.valid('json');
  const { requireEmailVerification, emailRedirectTo } = getAuthConfig();

  if (!isAllowedEmailDomain(email)) {
    throw new AppError(
      'Only @ccmailg.meijo-u.ac.jp email addresses are allowed',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: emailRedirectTo || undefined,
      data: {
        display_name: display_name || (email as string).split('@')[0],
      },
    },
  });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  if (!data.user) {
    throw new AppError('Failed to create user', HTTP_STATUS.BAD_REQUEST);
  }

  await ensureUserProfile({
    id: data.user.id,
    email,
    displayName: display_name || (email as string).split('@')[0],
  });

  if (!requireEmailVerification) {
    setSessionCookies(c, data.session?.access_token, data.session?.expires_in);
  }

  return c.json({
    message: requireEmailVerification
      ? 'User created successfully. Please check your email to confirm.'
      : 'User created successfully',
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}

export async function loginHandler(c: Context) {
  const supabase = getSupabase();
  const { email, password } = c.req.valid('json');
  const { requireEmailVerification, returnAccessToken } = getAuthConfig();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.UNAUTHORIZED);
  }

  if (requireEmailVerification && !data.user?.email_confirmed_at) {
    throw new AppError('Email address is not verified', HTTP_STATUS.FORBIDDEN);
  }

  setSessionCookies(c, data.session?.access_token, data.session?.expires_in);

  const response: Record<string, unknown> = {
    message: 'Login successful',
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  };

  if (returnAccessToken) {
    response.access_token = data.session?.access_token;
  }

  return c.json(response);
}

export async function logoutHandler(c: Context) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();

  clearSessionCookies(c);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Logout successful' });
}

export async function meHandler(c: Context) {
  const user = c.get('user') as AuthUser;

  const profile = await ensureUserProfile({
    id: user.id,
    email: user.email,
  });

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      display_name: profile?.display_name,
      created_at: profile?.created_at,
      is_banned: profile?.is_banned ?? false,
      is_admin: user.is_admin ?? false,
      total_likes: profile?.total_likes || 0,
    },
  });
}
