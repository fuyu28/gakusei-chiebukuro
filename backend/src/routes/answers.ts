import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError } from '../utils/errors';
import { verifyOwnership } from '../utils/authorization';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { TABLES } from '../constants/database';
import { AuthUser } from '../types';

const answers = new Hono();

// 回答作成スキーマ
const createAnswerSchema = z.object({
  thread_id: z.number().int().positive(),
  content: z.string().min(1),
});

// スレッドの回答一覧取得
answers.get('/threads/:thread_id', asyncHandler(async (c) => {
  const thread_id = parseInt(c.req.param('thread_id'));

  const { data, error } = await supabase
    .from(TABLES.ANSWERS)
    .select(`
      *,
      user:profiles(id, email, display_name)
    `)
    .eq('thread_id', thread_id)
    .order('is_best_answer', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ answers: data });
}));

// 回答投稿
answers.post('/', authMiddleware, zValidator('json', createAnswerSchema), asyncHandler(async (c: any) => {
  const user = c.get('user') as AuthUser;
  const { thread_id, content } = c.req.valid('json');

  // スレッドの存在確認と締切チェック
  const { data: thread, error: threadError } = await supabase
    .from(TABLES.THREADS)
    .select('deadline, status')
    .eq('id', thread_id)
    .single();

  if (threadError || !thread) {
    throw new AppError(ERROR_MESSAGES.THREAD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // 締切チェック
  if (thread.deadline && new Date(thread.deadline) < new Date()) {
    throw new AppError(ERROR_MESSAGES.DEADLINE_PASSED, HTTP_STATUS.BAD_REQUEST);
  }

  // 解決済みチェック
  if (thread.status === 'resolved') {
    throw new AppError(ERROR_MESSAGES.THREAD_RESOLVED, HTTP_STATUS.BAD_REQUEST);
  }

  // 回答を投稿
  const { data, error } = await supabaseAdmin
    .from(TABLES.ANSWERS)
    .insert({
      thread_id,
      content,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Answer created successfully', answer: data }, HTTP_STATUS.CREATED as any);
}));

// ベストアンサー選択
answers.patch('/:id/best', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const answer_id = parseInt(c.req.param('id'));

  // 回答の取得
  const { data: answer, error: answerError } = await supabase
    .from(TABLES.ANSWERS)
    .select('thread_id')
    .eq('id', answer_id)
    .single();

  if (answerError || !answer) {
    throw new AppError(ERROR_MESSAGES.ANSWER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // スレッドの所有者確認
  const { data: thread, error: threadError } = await supabase
    .from(TABLES.THREADS)
    .select('user_id')
    .eq('id', answer.thread_id)
    .single();

  if (threadError || !thread) {
    throw new AppError(ERROR_MESSAGES.THREAD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (thread.user_id !== user.id) {
    throw new AppError(ERROR_MESSAGES.ONLY_OWNER_CAN_SELECT_BEST, HTTP_STATUS.FORBIDDEN);
  }

  // 既存のBAを解除
  await supabaseAdmin
    .from(TABLES.ANSWERS)
    .update({ is_best_answer: false })
    .eq('thread_id', answer.thread_id);

  // 新しいBAを設定
  const { data: updatedAnswer, error: updateError } = await supabaseAdmin
    .from(TABLES.ANSWERS)
    .update({ is_best_answer: true })
    .eq('id', answer_id)
    .select()
    .single();

  if (updateError) {
    throw new AppError(updateError.message, HTTP_STATUS.BAD_REQUEST);
  }

  // スレッドを解決済みに更新
  await supabaseAdmin
    .from(TABLES.THREADS)
    .update({ status: 'resolved' })
    .eq('id', answer.thread_id);

  return c.json({
    message: 'Best answer selected successfully',
    answer: updatedAnswer,
  });
}));

// 回答削除
answers.delete('/:id', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const answer_id = parseInt(c.req.param('id'));

  // 回答の所有者確認
  await verifyOwnership(TABLES.ANSWERS, answer_id, user.id);

  // 削除
  const { error } = await supabaseAdmin.from(TABLES.ANSWERS).delete().eq('id', answer_id);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Answer deleted successfully' });
}));

export default answers;
