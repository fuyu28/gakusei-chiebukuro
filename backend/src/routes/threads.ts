import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';

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
threads.get('/', async (c) => {
  const status = c.req.query('status') as 'open' | 'resolved' | undefined;
  const subject_tag_id = c.req.query('subject_tag_id');
  const sort = c.req.query('sort') || 'created_at';
  const order = c.req.query('order') || 'desc';

  try {
    let query = supabase
      .from('threads')
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
      return c.json({ error: error.message }, 400);
    }

    // 回答数を追加
    const threadsWithCount = data?.map((thread: any) => ({
      ...thread,
      answers_count: thread.answers[0]?.count || 0,
      answers: undefined, // answers配列は不要なので削除
    }));

    return c.json({ threads: threadsWithCount });
  } catch (error) {
    console.error('Get threads error:', error);
    return c.json({ error: 'Failed to get threads' }, 500);
  }
});

// スレッド詳細取得
threads.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const { data, error } = await supabase
      .from('threads')
      .select(`
        *,
        subject_tag:subject_tags(id, name),
        user:profiles(id, email, display_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return c.json({ error: error.message }, 404);
    }

    return c.json({ thread: data });
  } catch (error) {
    console.error('Get thread error:', error);
    return c.json({ error: 'Failed to get thread' }, 500);
  }
});

// スレッド作成
threads.post('/', authMiddleware, zValidator('json', createThreadSchema), async (c) => {
  const user = c.get('user');
  const { title, content, subject_tag_id, deadline } = c.req.valid('json');

  try {
    const { data, error } = await supabase
      .from('threads')
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
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Thread created successfully', thread: data }, 201);
  } catch (error) {
    console.error('Create thread error:', error);
    return c.json({ error: 'Failed to create thread' }, 500);
  }
});

// スレッド更新
threads.patch('/:id', authMiddleware, zValidator('json', updateThreadSchema), async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));
  const updates = c.req.valid('json');

  try {
    // スレッドの所有者確認
    const { data: thread, error: fetchError } = await supabase
      .from('threads')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !thread) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    if (thread.user_id !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // 更新
    const { data, error } = await supabase
      .from('threads')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Thread updated successfully', thread: data });
  } catch (error) {
    console.error('Update thread error:', error);
    return c.json({ error: 'Failed to update thread' }, 500);
  }
});

// スレッド削除
threads.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));

  try {
    // スレッドの所有者確認
    const { data: thread, error: fetchError } = await supabase
      .from('threads')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !thread) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    if (thread.user_id !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // 削除
    const { error } = await supabase.from('threads').delete().eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Delete thread error:', error);
    return c.json({ error: 'Failed to delete thread' }, 500);
  }
});

export default threads;
