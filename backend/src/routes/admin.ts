import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { asyncHandler } from '../utils/errors';
import { listAllUsers, updateUserBanStatus } from '../services/admin';

const admin = new Hono();

const banSchema = z.object({
  is_banned: z.boolean(),
});

type BanBody = z.infer<typeof banSchema>;

admin.use('*', authMiddleware, adminMiddleware);

admin.get('/users', asyncHandler(async (c) => {
  const users = await listAllUsers();
  return c.json({ users });
}));

admin.patch('/users/:id/ban', zValidator('json', banSchema), asyncHandler(async (c) => {
  const userId = c.req.param('id');
  const { is_banned } = (c.req as any).valid('json') as BanBody;

  const user = await updateUserBanStatus(userId, is_banned);

  return c.json({
    message: is_banned ? 'User banned successfully' : 'User unbanned successfully',
    user,
  });
}));

export default admin;
