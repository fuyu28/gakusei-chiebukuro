import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const subjectTags = new Hono();

// 科目タグ作成スキーマ
const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// 科目タグ一覧取得
subjectTags.get('/', async (c) => {
  try {
    const { data, error } = await supabase
      .from('subject_tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ tags: data });
  } catch (error) {
    console.error('Get subject tags error:', error);
    return c.json({ error: 'Failed to get subject tags' }, 500);
  }
});

// 科目タグ作成（管理者用 - 後で権限チェックを追加）
subjectTags.post('/', zValidator('json', createTagSchema), async (c) => {
  const { name } = c.req.valid('json');

  try {
    const { data, error } = await supabase
      .from('subject_tags')
      .insert({ name })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Subject tag created successfully', tag: data }, 201);
  } catch (error) {
    console.error('Create subject tag error:', error);
    return c.json({ error: 'Failed to create subject tag' }, 500);
  }
});

export default subjectTags;
