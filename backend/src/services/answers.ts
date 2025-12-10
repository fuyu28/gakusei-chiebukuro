import { supabase, supabaseAdmin } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { AppError } from '../utils/errors';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { Answer, AnswerWithUser } from '../types';

export async function listAnswersByThread(threadId: number, currentUserId?: string): Promise<AnswerWithUser[]> {
  const { data, error } = await supabase
    .from(TABLES.ANSWERS)
    .select(`
      *,
      user:profiles(id, email, display_name),
      answer_likes(count)
    `)
    .eq('thread_id', threadId)
    .order('is_best_answer', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  const answers = data as any[];

  // If user is logged in, check which answers they liked
  let likedAnswerIds = new Set<number>();
  if (currentUserId) {
    const { data: likes } = await supabase
      .from(TABLES.ANSWER_LIKES)
      .select('answer_id')
      .eq('user_id', currentUserId)
      .in('answer_id', answers.map(a => a.id));

    if (likes) {
      likes.forEach((l: any) => likedAnswerIds.add(l.answer_id));
    }
  }

  return answers.map(a => ({
    ...a,
    likes_count: a.answer_likes?.[0]?.count || 0,
    is_liked_by_me: likedAnswerIds.has(a.id)
  }));
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

export async function likeAnswer(answerId: number, userId: string): Promise<void> {
  // 1. Get answer to find thread_id and answer author
  const answer = await getAnswerById(answerId);

  // 2. Get thread to find question owner
  const { data: thread, error: threadError } = await supabase
    .from(TABLES.THREADS)
    .select('user_id')
    .eq('id', answer.thread_id)
    .single();

  if (threadError || !thread) {
    throw new AppError('Thread not found', HTTP_STATUS.NOT_FOUND);
  }

  // 3. Check if user is question owner
  if (thread.user_id === userId) {
    throw new AppError('Question owner cannot like answers', HTTP_STATUS.FORBIDDEN);
  }

  // 4. Insert like
  const { error: likeError } = await supabase
    .from(TABLES.ANSWER_LIKES)
    .insert({ answer_id: answerId, user_id: userId });

  if (likeError) {
    if (likeError.code === '23505') { // Unique violation
      throw new AppError('Already liked', HTTP_STATUS.CONFLICT);
    }
    throw new AppError(likeError.message, HTTP_STATUS.BAD_REQUEST);
  }

  // 5. Increment total_likes for answer author
  // Note: This is not atomic without a transaction/RPC, but sufficient for now.
  // Ideally use an RPC like 'increment_likes'
  await incrementProfileLikes(answer.user_id);
}

export async function unlikeAnswer(answerId: number, userId: string): Promise<void> {
  const answer = await getAnswerById(answerId);

  const { error } = await supabase
    .from(TABLES.ANSWER_LIKES)
    .delete()
    .eq('answer_id', answerId)
    .eq('user_id', userId);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  // Decrement total_likes
  await decrementProfileLikes(answer.user_id);
}

async function incrementProfileLikes(userId: string) {
  // Fetch current likes
  const { data: profile } = await supabaseAdmin
    .from(TABLES.PROFILES)
    .select('total_likes')
    .eq('id', userId)
    .single();

  const current = profile?.total_likes || 0;

  await supabaseAdmin
    .from(TABLES.PROFILES)
    .update({ total_likes: current + 1 })
    .eq('id', userId);
}

async function decrementProfileLikes(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from(TABLES.PROFILES)
    .select('total_likes')
    .eq('id', userId)
    .single();

  const current = profile?.total_likes || 0;
  if (current > 0) {
    await supabaseAdmin
      .from(TABLES.PROFILES)
      .update({ total_likes: current - 1 })
      .eq('id', userId);
  }
}
