import { supabase, supabaseAdmin } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { Thread, ThreadWithDetails } from '../types';
import { AppError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';

type ThreadFilters = {
  status?: 'open' | 'resolved';
  subject_tag_id?: number;
  sort?: string;
  order?: 'asc' | 'desc';
};

export async function listThreads(filters: ThreadFilters): Promise<ThreadWithDetails[]> {
  const { status, subject_tag_id, sort = 'created_at', order = 'desc' } = filters;

  let query = supabase
    .from(TABLES.THREADS)
    .select(`
      *,
      subject_tag:subject_tags(id, name),
      user:profiles(id, email, display_name),
      answers(count)
    `);

  if (status) {
    query = query.eq('status', status);
  }

  if (subject_tag_id) {
    query = query.eq('subject_tag_id', subject_tag_id);
  }

  query = query.order(sort, { ascending: order === 'asc' });

  const { data, error } = await query;

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return (
    data?.map((thread: ThreadWithDetails & { answers: Array<{ count: number }> }) => ({
      ...thread,
      answers_count: thread.answers[0]?.count || 0,
      answers: undefined,
    })) || []
  );
}

export async function getThreadById(id: number): Promise<ThreadWithDetails> {
  const { data, error } = await supabase
    .from(TABLES.THREADS)
    .select(`
      *,
      subject_tag:subject_tags(id, name),
      user:profiles(id, email, display_name)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError(error?.message || 'Thread not found', HTTP_STATUS.NOT_FOUND);
  }

  return data as ThreadWithDetails;
}

export async function createThreadRecord(params: {
  title: string;
  content: string;
  subject_tag_id: number;
  deadline?: string | null;
  user_id: string;
}): Promise<Thread> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.THREADS)
    .insert({
      title: params.title,
      content: params.content,
      subject_tag_id: params.subject_tag_id,
      deadline: params.deadline || null,
      user_id: params.user_id,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to create thread', HTTP_STATUS.BAD_REQUEST);
  }

  return data as Thread;
}

export async function updateThreadById(id: number, updates: Partial<Thread>): Promise<Thread> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.THREADS)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to update thread', HTTP_STATUS.BAD_REQUEST);
  }

  return data as Thread;
}

export async function deleteThreadById(id: number): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLES.THREADS).delete().eq('id', id);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }
}

export async function getThreadOwner(threadId: number): Promise<{ user_id: string }> {
  const { data, error } = await supabase
    .from(TABLES.THREADS)
    .select('user_id')
    .eq('id', threadId)
    .single();

  if (error || !data) {
    throw new AppError('Thread not found', HTTP_STATUS.NOT_FOUND);
  }

  return data as { user_id: string };
}

export async function updateThreadStatus(
  threadId: number,
  status: 'open' | 'resolved'
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.THREADS)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', threadId);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }
}
