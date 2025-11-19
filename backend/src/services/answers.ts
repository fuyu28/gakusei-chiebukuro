import { supabase, supabaseAdmin } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { AppError } from '../utils/errors';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { Answer, AnswerWithUser } from '../types';

export async function listAnswersByThread(threadId: number): Promise<AnswerWithUser[]> {
  const { data, error } = await supabase
    .from(TABLES.ANSWERS)
    .select(`
      *,
      user:profiles(id, email, display_name)
    `)
    .eq('thread_id', threadId)
    .order('is_best_answer', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return (data as AnswerWithUser[]) || [];
}

export async function createAnswerRecord(params: {
  thread_id: number;
  content: string;
  user_id: string;
}): Promise<Answer> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ANSWERS)
    .insert({
      thread_id: params.thread_id,
      content: params.content,
      user_id: params.user_id,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to create answer', HTTP_STATUS.BAD_REQUEST);
  }

  return data as Answer;
}

export async function getAnswerById(answerId: number): Promise<Answer> {
  const { data, error } = await supabase
    .from(TABLES.ANSWERS)
    .select('id, thread_id, user_id, content, is_best_answer, created_at, updated_at')
    .eq('id', answerId)
    .single();

  if (error || !data) {
    throw new AppError(ERROR_MESSAGES.ANSWER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  return data as Answer;
}

export async function clearBestAnswer(threadId: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.ANSWERS)
    .update({ is_best_answer: false })
    .eq('thread_id', threadId);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }
}

export async function setBestAnswer(answerId: number): Promise<Answer> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ANSWERS)
    .update({ is_best_answer: true })
    .eq('id', answerId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to update answer', HTTP_STATUS.BAD_REQUEST);
  }

  return data as Answer;
}

export async function deleteAnswerById(answerId: number): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLES.ANSWERS).delete().eq('id', answerId);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }
}
