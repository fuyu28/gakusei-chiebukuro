import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { handleError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';
import { listSubjectTags, createSubjectTag, updateSubjectTag, deleteSubjectTag } from '../services/subjectTags';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const subjectTags = new Hono();
subjectTags.onError(handleError);

// 科目タグ作成スキーマ
const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// 科目タグ更新スキーマ
const updateTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// 科目タグ一覧取得
subjectTags.get('/', async (c) => {
  const tags = await listSubjectTags();
  return c.json({ tags });
});

// 科目タグ作成（管理者のみ）
subjectTags.post('/', authMiddleware, adminMiddleware, zValidator('json', createTagSchema), async (c) => {
  const { name } = c.req.valid('json');

  const tag = await createSubjectTag(name);

  return c.json({ message: 'Subject tag created successfully', tag }, HTTP_STATUS.CREATED);
});

// 科目タグ更新（管理者のみ）
subjectTags.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateTagSchema), async (c) => {
  const idParam = c.req.param('id');
  const id = Number(idParam);

  if (Number.isNaN(id)) {
    return c.json({ error: 'Invalid subject tag id' }, HTTP_STATUS.BAD_REQUEST);
  }

  const { name } = c.req.valid('json');

  const tag = await updateSubjectTag(id, name);

  return c.json({ message: 'Subject tag updated successfully', tag }, HTTP_STATUS.OK);
});

// 科目タグ削除（管理者のみ）
subjectTags.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const idParam = c.req.param('id');
  const id = Number(idParam);

  if (Number.isNaN(id)) {
    return c.json({ error: 'Invalid subject tag id' }, HTTP_STATUS.BAD_REQUEST);
  }

  await deleteSubjectTag(id);

  return c.json({ message: 'Subject tag deleted successfully' }, HTTP_STATUS.OK);
});

export default subjectTags;
