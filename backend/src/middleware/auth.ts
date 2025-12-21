import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { getSupabase } from '../lib/supabase';
import { getAuthCookieName } from '../lib/auth-cookie';
import { HTTP_STATUS } from '../constants/http';
import { isAdminFlag } from '../utils/admin';
import { AuthUser } from '../types';
import { ensureUserProfile } from '../services/profiles';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const cookieToken = getCookie(c, getAuthCookieName());
  const token = headerToken || cookieToken;

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('auth_token', token);

  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const profile = await ensureUserProfile({
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name,
    });

    if (profile?.is_banned) {
      return c.json({ error: 'Account has been banned' }, HTTP_STATUS.FORBIDDEN);
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      is_admin: isAdminFlag(profile?.is_admin),
      is_banned: profile?.is_banned ?? false,
    };

    c.set('user', authUser);
    await next();
  } catch (error) {
    return c.json({ error: 'Authentication failed' }, 401);
  }
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const cookieToken = getCookie(c, getAuthCookieName());
  const token = headerToken || cookieToken;

  if (!token) {
    await next();
    return;
  }

  c.set('auth_token', token);

  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const profile = await ensureUserProfile({
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name,
      });

      if (!profile?.is_banned) {
        const authUser: AuthUser = {
          id: user.id,
          email: user.email || '',
          is_admin: isAdminFlag(profile?.is_admin),
          is_banned: profile?.is_banned ?? false,
        };
        c.set('user', authUser);
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  await next();
}
