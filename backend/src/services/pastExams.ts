import { getSupabase, getSupabaseAdmin, getEnvVar } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { AppError } from '../utils/errors';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/http';
import type { PastExamFileWithRelations } from '../types';

const getBucketName = () => getEnvVar('SUPABASE_PAST_EXAM_BUCKET') || 'past-exams';
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_EXPIRATION = 60 * 60; // 1 hour

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

async function ensureSubjectTagExists(subjectTagId: number): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.SUBJECT_TAGS)
    .select('id')
    .eq('id', subjectTagId)
    .single();

  if (error || !data) {
    throw new AppError(ERROR_MESSAGES.SUBJECT_TAG_NOT_FOUND, HTTP_STATUS.BAD_REQUEST);
  }
}

async function createSignedUrl(filePath: string): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.storage
    .from(getBucketName())
    .createSignedUrl(filePath, SIGNED_URL_EXPIRATION);

  if (error || !data?.signedUrl) {
    console.warn('Failed to create signed URL for file', filePath, error?.message);
    return null;
  }

  return data.signedUrl;
}

export async function listPastExamFiles(subjectTagId?: number): Promise<PastExamFileWithRelations[]> {
  // 閲覧は全員可だが、RLS設定漏れでも落ちないようサービスロールで実行
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from(TABLES.PAST_EXAMS)
    .select(`
      *,
      subject_tag:subject_tags(id, name),
      uploader:profiles(id, email, display_name)
    `)
    .order('created_at', { ascending: false });

  if (typeof subjectTagId === 'number') {
    query = query.eq('subject_tag_id', subjectTagId);
  }

  const { data, error } = await query;

  if (error) {
    const debugMessage = [error.message, error.details, error.hint, error.code]
      .filter(Boolean)
      .join(' | ');

    console.error('Failed to fetch past exam files from Supabase', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new AppError(
      debugMessage || ERROR_MESSAGES.FAILED_TO_GET_PAST_EXAMS,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const files = (data as PastExamFileWithRelations[]) || [];

  return Promise.all(
    files.map(async (file) => {
      const downloadUrl = await createSignedUrl(file.file_path);
      return { ...file, download_url: downloadUrl || undefined };
    })
  );
}

export async function uploadPastExamFile(params: {
  file: File;
  subjectTagId: number;
  uploadedBy: string;
  title?: string;
}): Promise<PastExamFileWithRelations> {
  if (!params.file) {
    throw new AppError(ERROR_MESSAGES.FILE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  if (!ALLOWED_MIME_TYPES.includes(params.file.type)) {
    throw new AppError(ERROR_MESSAGES.INVALID_FILE_TYPE, HTTP_STATUS.BAD_REQUEST);
  }

  const fileBuffer = Buffer.from(await params.file.arrayBuffer());

  if (fileBuffer.byteLength > MAX_FILE_SIZE) {
    throw new AppError(ERROR_MESSAGES.FILE_TOO_LARGE, HTTP_STATUS.BAD_REQUEST);
  }

  await ensureSubjectTagExists(params.subjectTagId);

  const normalizedName = params.file.name ? sanitizeFileName(params.file.name) : 'uploaded_file';
  const filePath = `subject-${params.subjectTagId}/${Date.now()}-${normalizedName}`;

  const supabaseAdmin = getSupabaseAdmin();
  const { error: uploadError } = await supabaseAdmin.storage
    .from(getBucketName())
    .upload(filePath, fileBuffer, {
      contentType: params.file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new AppError(ERROR_MESSAGES.FAILED_TO_UPLOAD_FILE, HTTP_STATUS.BAD_REQUEST);
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.PAST_EXAMS)
    .insert({
      subject_tag_id: params.subjectTagId,
      title: params.title || params.file.name || 'uploaded file',
      file_path: filePath,
      file_type: params.file.type || 'application/octet-stream',
      file_size: fileBuffer.byteLength,
      uploaded_by: params.uploadedBy,
    })
    .select(`
      *,
      subject_tag:subject_tags(id, name),
      uploader:profiles(id, email, display_name)
    `)
    .single();

  if (error || !data) {
    await supabaseAdmin.storage.from(getBucketName()).remove([filePath]);
    throw new AppError(error?.message || ERROR_MESSAGES.FAILED_TO_UPLOAD_FILE, HTTP_STATUS.BAD_REQUEST);
  }

  const downloadUrl = await createSignedUrl(filePath);
  return { ...(data as PastExamFileWithRelations), download_url: downloadUrl || undefined };
}

export async function deletePastExamFileById(id: number): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TABLES.PAST_EXAMS)
    .select('id, file_path')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError(ERROR_MESSAGES.PAST_EXAM_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const { error: storageError } = await supabaseAdmin.storage
    .from(getBucketName())
    .remove([data.file_path]);

  if (storageError) {
    throw new AppError(
      storageError.message || ERROR_MESSAGES.FAILED_TO_DELETE_PAST_EXAM,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from(TABLES.PAST_EXAMS)
    .delete()
    .eq('id', id);

  if (deleteError) {
    throw new AppError(deleteError.message, HTTP_STATUS.BAD_REQUEST);
  }
}
