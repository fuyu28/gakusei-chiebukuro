import { Hono } from 'hono';
import { asyncHandler, AppError } from '../utils/errors';
import { listPastExamFiles, uploadPastExamFile } from '../services/pastExams';
import { authMiddleware } from '../middleware/auth';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/http';
import { AuthUser } from '../types';

const pastExams = new Hono();
// 過去問一覧取得（科目でフィルタ可能）
pastExams.get('/', asyncHandler(async (c) => {
  const subjectTagParam = c.req.query('subject_tag_id');
  const subjectTagId = subjectTagParam ? parseInt(subjectTagParam, 10) : undefined;

  if (subjectTagParam && (!subjectTagId || Number.isNaN(subjectTagId))) {
    throw new AppError(ERROR_MESSAGES.SUBJECT_TAG_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const files = await listPastExamFiles(subjectTagId);
  return c.json({ files });
}));

// 過去問アップロード
pastExams.post('/', authMiddleware, asyncHandler(async (c: any) => {
  const user = c.get('user') as AuthUser;
  const formData = await c.req.parseBody();

  const subjectTagIdRaw = formData['subject_tag_id'];
  const title = typeof formData['title'] === 'string' ? formData['title'] : undefined;
  const fileInput = formData['file'];

  const subjectTagId = typeof subjectTagIdRaw === 'string' ? parseInt(subjectTagIdRaw, 10) : undefined;

  if (!subjectTagId || Number.isNaN(subjectTagId)) {
    throw new AppError(ERROR_MESSAGES.SUBJECT_TAG_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  if (!(fileInput instanceof File)) {
    throw new AppError(ERROR_MESSAGES.FILE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const file = await uploadPastExamFile({
    file: fileInput,
    subjectTagId,
    uploadedBy: user.id,
    title,
  });

  return c.json({ message: 'Past exam uploaded successfully', file }, HTTP_STATUS.CREATED as any);
}));

export default pastExams;
