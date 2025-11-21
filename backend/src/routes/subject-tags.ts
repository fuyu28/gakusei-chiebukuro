import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asyncHandler } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';
import { listSubjectTags, createSubjectTag } from '../services/subjectTags';

const subjectTags = new Hono();

// 科目タグ作成スキーマ
const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// 科目タグ一覧取得
subjectTags.get('/', asyncHandler(async (c) => {
  const tags = await listSubjectTags();
  return c.json({ tags });
}));

// 科目タグ作成（管理者用 - 後で権限チェックを追加）
subjectTags.post('/', zValidator('json', createTagSchema), asyncHandler(async (c: any) => {
  const { name } = c.req.valid('json');

  const tag = await createSubjectTag(name);

  return c.json({ message: 'Subject tag created successfully', tag }, HTTP_STATUS.CREATED as any);
}));

export default subjectTags;
