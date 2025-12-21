import { Hono, type Context, type Next } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createRateLimitMiddleware } from '../../middleware/rate-limit';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../utils/errors';
import { getAuthConfig } from '../../config/auth';
import { loginSchema, signupSchema } from './schemas';
import { loginHandler, logoutHandler, meHandler, signupHandler } from './handlers';

const auth = new Hono();

const authRateLimit = async (c: Context, next: Next) => {
  const { rateLimit } = getAuthConfig();
  return createRateLimitMiddleware({
    keyPrefix: 'auth',
    windowMs: rateLimit.windowMs,
    max: rateLimit.max,
  })(c, next);
};

auth.post('/signup', authRateLimit, zValidator('json', signupSchema), asyncHandler(signupHandler));
auth.post('/login', authRateLimit, zValidator('json', loginSchema), asyncHandler(loginHandler));
auth.post('/logout', authMiddleware, asyncHandler(logoutHandler));
auth.get('/me', authMiddleware, asyncHandler(meHandler));

export default auth;
