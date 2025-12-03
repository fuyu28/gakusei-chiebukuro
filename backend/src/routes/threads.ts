import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { handleError, AppError } from '../utils/errors';
import { verifyOwnership } from '../utils/authorization';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/http';
import { TABLES } from '../constants/database';
import { AuthUser } from '../types';
import {
  listThreads,
  getThreadById,
  createThreadRecord,
  updateThreadById,
  deleteThreadById,
} from '../services/threads';

const threads = new Hono<{ Variables: { user: AuthUser } }>();
threads.onError(handleError);

// スレッド作成スキーマ
const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  subject_tag_id: z.number().int().positive(),
  deadline: z.string().datetime().optional(),
});

// スレッド更新スキーマ
const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  subject_tag_id: z.number().int().positive().optional(),
  status: z.enum(['open', 'resolved']).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

type CreateThreadPayload = z.infer<typeof createThreadSchema>;
type UpdateThreadPayload = z.infer<typeof updateThreadSchema>;

// スレッド一覧取得
threads.get('/', async (c) => {
  const statusParam = c.req.query('status');
  const status = statusParam === 'open' || statusParam === 'resolved' ? statusParam : undefined;
  const subject_tag_id = c.req.query('subject_tag_id');
  const sort = c.req.query('sort') || 'created_at';
  const order = c.req.query('order') || 'desc';

  const threadsList = await listThreads({
    status,
    subject_tag_id: subject_tag_id ? parseInt(subject_tag_id, 10) : undefined,
    sort,
    order: order === 'asc' ? 'asc' : 'desc',
  });

  return c.json({ threads: threadsList });
});

// スレッド詳細取得
threads.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const thread = await getThreadById(id);
  return c.json({ thread });
});

// スレッド作成
threads.post('/', authMiddleware, zValidator('json', createThreadSchema), async (c) => {
  const user = c.get('user');
  const { title, content, subject_tag_id, deadline } = c.req.valid('json') as CreateThreadPayload;

  const thread = await createThreadRecord({
    title,
    content,
    subject_tag_id,
    deadline: deadline || null,
    user_id: user.id,
  });

  return c.json({ message: 'Thread created successfully', thread }, HTTP_STATUS.CREATED);
});

// スレッド更新
threads.patch('/:id', authMiddleware, zValidator('json', updateThreadSchema), async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));
  const updates = c.req.valid('json') as UpdateThreadPayload;

  // スレッドの所有者確認
  await verifyOwnership(TABLES.THREADS, id, user.id);

  // 更新
  const updatedThread = await updateThreadById(id, updates);

  return c.json({ message: 'Thread updated successfully', thread: updatedThread });
});

// スレッド削除
threads.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));

  if (Number.isNaN(id)) {
    throw new AppError(ERROR_MESSAGES.FAILED_TO_DELETE_THREAD, HTTP_STATUS.BAD_REQUEST);
  }

  const thread = await getThreadById(id);

  if (!user.is_admin && thread.user_id !== user.id) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN);
  }

  await deleteThreadById(id);

  return c.json({ message: 'Thread deleted successfully' });
});

export default threads;
