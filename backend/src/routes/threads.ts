import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';
import { verifyOwnership } from '../utils/authorization';
import { HTTP_STATUS } from '../constants/http';
import { TABLES } from '../constants/database';
import { AuthUser } from '../types';
import {
  listThreads,
  getThreadById,
  createThreadRecord,
  updateThreadById,
  deleteThreadById,
} from '../services/threads';

const threads = new Hono();

// スレッド作成スキーマ
const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  subject_tag_id: z.number().int().positive(),
  deadline: z.string().datetime().optional(),
});

// スレッド更新スキーマ
const updateThreadSchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  deadline: z.string().datetime().optional(),
});

// スレッド一覧取得
threads.get('/', asyncHandler(async (c) => {
  const status = c.req.query('status') as 'open' | 'resolved' | undefined;
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
}));

// スレッド詳細取得
threads.get('/:id', asyncHandler(async (c) => {
  const id = parseInt(c.req.param('id'));

  const thread = await getThreadById(id);
  return c.json({ thread });
}));

// スレッド作成
threads.post('/', authMiddleware, zValidator('json', createThreadSchema), asyncHandler(async (c: any) => {
  const user = c.get('user') as AuthUser;
  const { title, content, subject_tag_id, deadline } = c.req.valid('json');

  const thread = await createThreadRecord({
    title,
    content,
    subject_tag_id,
    deadline: deadline || null,
    user_id: user.id,
  });

  return c.json({ message: 'Thread created successfully', thread }, HTTP_STATUS.CREATED as any);
}));

// スレッド更新
threads.patch('/:id', authMiddleware, zValidator('json', updateThreadSchema), asyncHandler(async (c: any) => {
  const user = c.get('user') as AuthUser;
  const id = parseInt(c.req.param('id'));
  const updates: any = c.req.valid('json');

  // スレッドの所有者確認
  await verifyOwnership(TABLES.THREADS, id, user.id);

  // 更新
  const updatedThread = await updateThreadById(id, updates);

  return c.json({ message: 'Thread updated successfully', thread: updatedThread });
}));

// スレッド削除
threads.delete('/:id', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const id = parseInt(c.req.param('id'));

  // スレッドの所有者確認
  await verifyOwnership(TABLES.THREADS, id, user.id);
  await deleteThreadById(id);

  return c.json({ message: 'Thread deleted successfully' });
}));

export default threads;
