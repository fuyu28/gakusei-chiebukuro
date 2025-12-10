import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { asyncHandler, AppError } from '../utils/errors';
import { verifyOwnership } from '../utils/authorization';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { TABLES } from '../constants/database';
import { AuthUser } from '../types';
import { getThreadById, getThreadOwner, updateThreadStatus } from '../services/threads';
import {
  listAnswersByThread,
  createAnswerRecord,
  getAnswerById,
  clearBestAnswer,
  setBestAnswer,
  deleteAnswerById,
  likeAnswer,
  unlikeAnswer,
} from '../services/answers';

const answers = new Hono();

// 回答作成スキーマ
const createAnswerSchema = z.object({
  thread_id: z.number().int().positive(),
  content: z.string().min(1),
});

// スレッドの回答一覧取得
answers.get('/threads/:thread_id', optionalAuthMiddleware, asyncHandler(async (c) => {
  const thread_id = parseInt(c.req.param('thread_id'));
  const user = c.get('user') as AuthUser | undefined;

  const answersList = await listAnswersByThread(thread_id, user?.id);
  return c.json({ answers: answersList });
}));

// 回答投稿
answers.post('/', authMiddleware, zValidator('json', createAnswerSchema), asyncHandler(async (c: any) => {
  const user = c.get('user') as AuthUser;
  const { thread_id, content } = c.req.valid('json');

  // スレッドの存在確認と締切チェック
  const thread = await getThreadById(thread_id);

  // 締切チェック
  if (thread.deadline && new Date(thread.deadline) < new Date()) {
    throw new AppError(ERROR_MESSAGES.DEADLINE_PASSED, HTTP_STATUS.BAD_REQUEST);
  }

  // 解決済みチェック
  if (thread.status === 'resolved') {
    throw new AppError(ERROR_MESSAGES.THREAD_RESOLVED, HTTP_STATUS.BAD_REQUEST);
  }

  // 回答を投稿
  const answer = await createAnswerRecord({ thread_id, content, user_id: user.id });

  return c.json({ message: 'Answer created successfully', answer }, HTTP_STATUS.CREATED as any);
}));

// ベストアンサー選択
answers.patch('/:id/best', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const answer_id = parseInt(c.req.param('id'));

  // 回答の取得
  const answer = await getAnswerById(answer_id);

  // スレッドの所有者確認
  const threadOwner = await getThreadOwner(answer.thread_id);

  if (threadOwner.user_id !== user.id) {
    throw new AppError(ERROR_MESSAGES.ONLY_OWNER_CAN_SELECT_BEST, HTTP_STATUS.FORBIDDEN);
  }

  // 既存のBAを解除
  await clearBestAnswer(answer.thread_id);

  // 新しいBAを設定
  const updatedAnswer = await setBestAnswer(answer_id);

  // スレッドを解決済みに更新
  await updateThreadStatus(answer.thread_id, 'resolved');

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
  await deleteAnswerById(answer_id);

  return c.json({ message: 'Answer deleted successfully' });
}));

// いいね
answers.post('/:id/like', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const answer_id = parseInt(c.req.param('id'));

  await likeAnswer(answer_id, user.id);

  return c.json({ message: 'Liked successfully' });
}));

// いいね解除
answers.delete('/:id/like', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const answer_id = parseInt(c.req.param('id'));

  await unlikeAnswer(answer_id, user.id);

  return c.json({ message: 'Unliked successfully' });
}));

export default answers;
