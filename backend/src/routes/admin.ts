import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { asyncHandler } from '../utils/errors';
import { listAllUsers, updateUserBanStatus } from '../services/admin';
import { HTTP_STATUS } from '../constants/http';

const admin = new Hono();

const banSchema = z.object({
  is_banned: z.boolean(),
});

admin.use('*', authMiddleware, adminMiddleware);

admin.get('/users', asyncHandler(async (c) => {
  const users = await listAllUsers();
  return c.json({ users });
}));

admin.patch('/users/:id/ban', zValidator('json', banSchema), asyncHandler(async (c: any) => {
  const userId = c.req.param('id');
  const { is_banned } = c.req.valid('json');

  const user = await updateUserBanStatus(userId, is_banned);

  return c.json({
    message: is_banned ? 'User banned successfully' : 'User unbanned successfully',
    user,
  }, HTTP_STATUS.OK as any);
}));

export default admin;
