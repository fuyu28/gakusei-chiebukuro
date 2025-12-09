import { Hono } from 'hono';
import { handleError, AppError } from '../utils/errors';
import { listPastExamFiles, uploadPastExamFile, deletePastExamFileById } from '../services/pastExams';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/http';
import { AuthUser } from '../types';

const pastExams = new Hono<{ Variables: { user: AuthUser } }>();
pastExams.onError(handleError);
// 過去問一覧取得（科目でフィルタ可能）
pastExams.get('/', async (c) => {
  const subjectTagParam = c.req.query('subject_tag_id');
  const subjectTagId = subjectTagParam ? parseInt(subjectTagParam, 10) : undefined;

  if (subjectTagParam && (!subjectTagId || Number.isNaN(subjectTagId))) {
    throw new AppError(ERROR_MESSAGES.SUBJECT_TAG_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const files = await listPastExamFiles(subjectTagId);
  return c.json({ files });
});

// 過去問アップロード
pastExams.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const formData = await c.req.parseBody();

  const subjectTagIdRaw = formData['subject_tag_id'];
  const title = typeof formData['title'] === 'string' ? formData['title'] : undefined;
  const fileInput = formData['file'];

  const subjectTagId = typeof subjectTagIdRaw === 'string' ? parseInt(subjectTagIdRaw, 10) : undefined;

  if (!subjectTagId || Number.isNaN(subjectTagId)) {
    throw new AppError(ERROR_MESSAGES.SUBJECT_TAG_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const files = Array.isArray(fileInput) ? fileInput : [fileInput];

  if (files.length === 0 || files.some((item) => !(item instanceof File))) {
    throw new AppError(ERROR_MESSAGES.FILE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const uploadedFiles = await Promise.all(
    files.map((file) =>
      uploadPastExamFile({
        file,
        subjectTagId,
        uploadedBy: user.id,
        title: files.length === 1 ? title : undefined,
      })
    )
  );

  return c.json({ message: 'Past exam uploaded successfully', files: uploadedFiles }, HTTP_STATUS.CREATED);
});

pastExams.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const pastExamId = parseInt(c.req.param('id'), 10);

  if (Number.isNaN(pastExamId)) {
    throw new AppError(ERROR_MESSAGES.FAILED_TO_DELETE_PAST_EXAM, HTTP_STATUS.BAD_REQUEST);
  }

  await deletePastExamFileById(pastExamId);

  return c.json({ message: 'Past exam deleted successfully' });
});

export default pastExams;
