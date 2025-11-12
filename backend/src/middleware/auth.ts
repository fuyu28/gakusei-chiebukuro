import { Context, Next } from 'hono';
import { supabase } from '../lib/supabase';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // ユーザー情報をコンテキストに設定
    c.set('user', user);
    await next();
  } catch (error) {
    return c.json({ error: 'Authentication failed' }, 401);
  }
}
