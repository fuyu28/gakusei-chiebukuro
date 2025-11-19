import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { asyncHandler, AppError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';
import { TABLES } from '../constants/database';

const subjectTags = new Hono();

// 科目タグ作成スキーマ
const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// 科目タグ一覧取得
subjectTags.get('/', asyncHandler(async (c) => {
  const { data, error } = await supabase
    .from(TABLES.SUBJECT_TAGS)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ tags: data });
}));

// 科目タグ作成（管理者用 - 後で権限チェックを追加）
subjectTags.post('/', zValidator('json', createTagSchema), asyncHandler(async (c: any) => {
  const { name } = c.req.valid('json');

  const { data, error } = await supabase
    .from(TABLES.SUBJECT_TAGS)
    .insert({ name })
    .select()
    .single();

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Subject tag created successfully', tag: data }, HTTP_STATUS.CREATED as any);
}));

export default subjectTags;
