import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';

const answers = new Hono();

// 回答作成スキーマ
const createAnswerSchema = z.object({
  thread_id: z.number().int().positive(),
  content: z.string().min(1),
});

// スレッドの回答一覧取得
answers.get('/threads/:thread_id', async (c) => {
  const thread_id = parseInt(c.req.param('thread_id'));

  try {
    const { data, error } = await supabase
      .from('answers')
      .select(`
        *,
        user:profiles(id, email, display_name)
      `)
      .eq('thread_id', thread_id)
      .order('is_best_answer', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ answers: data });
  } catch (error) {
    console.error('Get answers error:', error);
    return c.json({ error: 'Failed to get answers' }, 500);
  }
});

// 回答投稿
answers.post('/', authMiddleware, zValidator('json', createAnswerSchema), async (c) => {
  const user = c.get('user');
  const { thread_id, content } = c.req.valid('json');

  try {
    // スレッドの存在確認と締切チェック
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('deadline, status')
      .eq('id', thread_id)
      .single();

    if (threadError || !thread) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    // 締切チェック
    if (thread.deadline && new Date(thread.deadline) < new Date()) {
      return c.json({ error: 'Answer deadline has passed' }, 400);
    }

    // 解決済みチェック
    if (thread.status === 'resolved') {
      return c.json({ error: 'Thread is already resolved' }, 400);
    }

    // 回答を投稿
    const { data, error } = await supabase
      .from('answers')
      .insert({
        thread_id,
        content,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Answer created successfully', answer: data }, 201);
  } catch (error) {
    console.error('Create answer error:', error);
    return c.json({ error: 'Failed to create answer' }, 500);
  }
});

// ベストアンサー選択
answers.patch('/:id/best', authMiddleware, async (c) => {
  const user = c.get('user');
  const answer_id = parseInt(c.req.param('id'));

  try {
    // 回答の取得
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .select('thread_id')
      .eq('id', answer_id)
      .single();

    if (answerError || !answer) {
      return c.json({ error: 'Answer not found' }, 404);
    }

    // スレッドの所有者確認
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('user_id')
      .eq('id', answer.thread_id)
      .single();

    if (threadError || !thread) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    if (thread.user_id !== user.id) {
      return c.json({ error: 'Only thread owner can select best answer' }, 403);
    }

    // 既存のBAを解除
    await supabase
      .from('answers')
      .update({ is_best_answer: false })
      .eq('thread_id', answer.thread_id);

    // 新しいBAを設定
    const { data: updatedAnswer, error: updateError } = await supabase
      .from('answers')
      .update({ is_best_answer: true })
      .eq('id', answer_id)
      .select()
      .single();

    if (updateError) {
      return c.json({ error: updateError.message }, 400);
    }

    // スレッドを解決済みに更新
    await supabase
      .from('threads')
      .update({ status: 'resolved' })
      .eq('id', answer.thread_id);

    return c.json({
      message: 'Best answer selected successfully',
      answer: updatedAnswer,
    });
  } catch (error) {
    console.error('Select best answer error:', error);
    return c.json({ error: 'Failed to select best answer' }, 500);
  }
});

// 回答削除
answers.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const answer_id = parseInt(c.req.param('id'));

  try {
    // 回答の所有者確認
    const { data: answer, error: fetchError } = await supabase
      .from('answers')
      .select('user_id')
      .eq('id', answer_id)
      .single();

    if (fetchError || !answer) {
      return c.json({ error: 'Answer not found' }, 404);
    }

    if (answer.user_id !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // 削除
    const { error } = await supabase.from('answers').delete().eq('id', answer_id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error);
    return c.json({ error: 'Failed to delete answer' }, 500);
  }
});

export default answers;
