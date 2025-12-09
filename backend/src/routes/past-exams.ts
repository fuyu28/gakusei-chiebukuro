import { Hono } from 'hono';
import { handleError, AppError } from '../utils/errors';
import { listPastExamFiles, uploadPastExamFile, deletePastExamFileById } from '../services/pastExams';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/http';
import { AuthUser } from '../types';

function parseSubjectTagId(raw: unknown): number {
  const parsed = typeof raw === 'string' ? parseInt(raw, 10) : undefined;
  if (!parsed || Number.isNaN(parsed)) {
    throw new AppError(ERROR_MESSAGES.SUBJECT_TAG_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }
  return parsed;
}

function ensureFiles(input: unknown): File[] {
  const files = Array.isArray(input) ? input : [input];

  if (files.length === 0 || files.some((item) => !(item instanceof File))) {
    throw new AppError(ERROR_MESSAGES.FILE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  return files as File[];
}

function parseIdParam(idParam: string, errorMessage: string): number {
  const parsed = parseInt(idParam, 10);

  if (Number.isNaN(parsed)) {
    throw new AppError(errorMessage, HTTP_STATUS.BAD_REQUEST);
  }

  return parsed;
}

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

  const subjectTagId = parseSubjectTagId(formData['subject_tag_id']);
  const title = typeof formData['title'] === 'string' ? formData['title'] : undefined;
  const files = ensureFiles(formData['file']);

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
  const pastExamId = parseIdParam(c.req.param('id'), ERROR_MESSAGES.FAILED_TO_DELETE_PAST_EXAM);
  await deletePastExamFileById(pastExamId);

  return c.json({ message: 'Past exam deleted successfully' });
});

export default pastExams;
