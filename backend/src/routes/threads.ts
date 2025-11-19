import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError } from '../utils/errors';
import { verifyOwnership } from '../utils/authorization';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { TABLES } from '../constants/database';
import { AuthUser, ThreadWithDetails } from '../types';

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

  let query = supabase
    .from(TABLES.THREADS)
    .select(`
      *,
      subject_tag:subject_tags(id, name),
      user:profiles(id, email, display_name),
      answers(count)
    `);

  // フィルター
  if (status) {
    query = query.eq('status', status);
  }

  if (subject_tag_id) {
    query = query.eq('subject_tag_id', parseInt(subject_tag_id));
  }

  // ソート
  query = query.order(sort, { ascending: order === 'asc' });

  const { data, error } = await query;

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  // 回答数を追加
  const threadsWithCount = data?.map((thread: ThreadWithDetails & { answers: any[] }) => ({
    ...thread,
    answers_count: thread.answers[0]?.count || 0,
    answers: undefined, // answers配列は不要なので削除
  }));

  return c.json({ threads: threadsWithCount });
}));

// スレッド詳細取得
threads.get('/:id', asyncHandler(async (c) => {
  const id = parseInt(c.req.param('id'));

  const { data, error } = await supabase
    .from(TABLES.THREADS)
    .select(`
      *,
      subject_tag:subject_tags(id, name),
      user:profiles(id, email, display_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.NOT_FOUND);
  }

  return c.json({ thread: data });
}));

// スレッド作成
threads.post('/', authMiddleware, zValidator('json', createThreadSchema), asyncHandler(async (c: any) => {
  const user = c.get('user') as AuthUser;
  const { title, content, subject_tag_id, deadline } = c.req.valid('json');

  const { data, error } = await supabase
    .from(TABLES.THREADS)
    .insert({
      title,
      content,
      subject_tag_id,
      deadline: deadline || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Thread created successfully', thread: data }, HTTP_STATUS.CREATED as any);
}));

// スレッド更新
threads.patch('/:id', authMiddleware, zValidator('json', updateThreadSchema), asyncHandler(async (c: any) => {
  const user = c.get('user') as AuthUser;
  const id = parseInt(c.req.param('id'));
  const updates: any = c.req.valid('json');

  // スレッドの所有者確認
  await verifyOwnership(TABLES.THREADS, id, user.id);

  // 更新
  const { data, error } = await supabase
    .from(TABLES.THREADS)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Thread updated successfully', thread: data });
}));

// スレッド削除
threads.delete('/:id', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const id = parseInt(c.req.param('id'));

  // スレッドの所有者確認
  await verifyOwnership(TABLES.THREADS, id, user.id);

  // 削除
  const { error } = await supabase.from(TABLES.THREADS).delete().eq('id', id);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Thread deleted successfully' });
}));

export default threads;
