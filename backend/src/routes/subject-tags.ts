import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asyncHandler } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';
import { listSubjectTags, createSubjectTag } from '../services/subjectTags';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const subjectTags = new Hono();

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

type CreateTagBody = z.infer<typeof createTagSchema>;

subjectTags.get('/', asyncHandler(async (c) => {
  const tags = await listSubjectTags();
  return c.json({ tags });
}));

subjectTags.post('/', authMiddleware, adminMiddleware, zValidator('json', createTagSchema), asyncHandler(async (c) => {
  const { name } = (c.req as any).valid('json') as CreateTagBody;
  const tag = await createSubjectTag(name);
  return c.json({ message: 'Subject tag created successfully', tag }, HTTP_STATUS.CREATED);
}));

export default subjectTags;
