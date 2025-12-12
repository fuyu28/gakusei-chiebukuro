import { Context, Next } from 'hono';
import { getSupabase } from '../lib/supabase';
import { HTTP_STATUS } from '../constants/http';
import { isAdminFlag } from '../utils/admin';
import { AuthUser } from '../types';
import { ensureUserProfile } from '../services/profiles';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
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

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await next();
    return;
  }

  const token = authHeader.substring(7);
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
