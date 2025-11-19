import { Context, Next } from 'hono';
import { HTTP_STATUS } from '../constants/http';
import { AuthUser } from '../types';

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user') as AuthUser | undefined;

  if (!user?.is_admin) {
    return c.json({ error: 'Forbidden' }, HTTP_STATUS.FORBIDDEN);
  }

  await next();
}
