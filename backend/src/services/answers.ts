import { supabase, supabaseAdmin, createClientWithToken } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { AppError } from '../utils/errors';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { Answer, AnswerWithUser } from '../types';

type LikesState = {
  likeCountMap: Map<number, number>;
  likedAnswerIds: Set<number>;
};

async function getLikesState(answerIds: number[], currentUserId?: string): Promise<LikesState> {
  const likeCountMap = new Map<number, number>();
  const likedAnswerIds = new Set<number>();

  if (answerIds.length === 0) {
    return { likeCountMap, likedAnswerIds };
  }

  // 全体のいいね件数を集計
  const { data: allLikes, error: allLikesError } = await supabase
    .from(TABLES.ANSWER_LIKES)
    .select('answer_id')
    .in('answer_id', answerIds);

  if (allLikesError) {
    throw new AppError(allLikesError.message, HTTP_STATUS.BAD_REQUEST);
  }

  allLikes?.forEach((l: any) => {
    likeCountMap.set(l.answer_id, (likeCountMap.get(l.answer_id) || 0) + 1);
  });

  // ログイン済みユーザーのいいね済み一覧
  if (currentUserId) {
    const { data: likes } = await supabase
      .from(TABLES.ANSWER_LIKES)
      .select('answer_id')
      .eq('user_id', currentUserId)
      .in('answer_id', answerIds);

    likes?.forEach((l: any) => likedAnswerIds.add(l.answer_id));
  }

  return { likeCountMap, likedAnswerIds };
}

export async function listAnswersByThread(threadId: number, currentUserId?: string): Promise<AnswerWithUser[]> {
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

  const answers = (data as any[]) || [];
  const answerIds = answers.map(a => a.id);
  const { likeCountMap, likedAnswerIds } = await getLikesState(answerIds, currentUserId);

  return answers.map(a => ({
    ...a,
    likes_count: likeCountMap.get(a.id) || 0,
    is_liked_by_me: likedAnswerIds.has(a.id)
  }));
}

export async function createAnswerRecord(params: {
  thread_id: number;
  content: string;
  user_id: string;
  token: string;
}): Promise<Answer> {
  const supabaseWithToken = createClientWithToken(params.token);

  const { data, error } = await supabaseWithToken
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

export async function deleteAnswerById(answerId: number, token: string): Promise<void> {
  const supabaseWithToken = createClientWithToken(token);

  const { error } = await supabaseWithToken.from(TABLES.ANSWERS).delete().eq('id', answerId);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }
}

export async function likeAnswer(answerId: number, userId: string, token: string): Promise<{ likes_count: number; is_liked_by_me: boolean }> {
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
  const supabaseWithToken = createClientWithToken(token);

  const { error: likeError } = await supabaseWithToken
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

  // 6. 最新のいいね状態を返す（呼び出し側がレスポンスに含めやすいように）
  const { likeCountMap, likedAnswerIds } = await getLikesState([answerId], userId);
  return {
    likes_count: likeCountMap.get(answerId) || 0,
    is_liked_by_me: likedAnswerIds.has(answerId),
  };
}

export async function unlikeAnswer(answerId: number, userId: string, token: string): Promise<{ likes_count: number; is_liked_by_me: boolean }> {
  const answer = await getAnswerById(answerId);

  const supabaseWithToken = createClientWithToken(token);

  const { error } = await supabaseWithToken
    .from(TABLES.ANSWER_LIKES)
    .delete()
    .eq('answer_id', answerId)
    .eq('user_id', userId);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  // Decrement total_likes
  await decrementProfileLikes(answer.user_id);

  const { likeCountMap, likedAnswerIds } = await getLikesState([answerId], userId);
  return {
    likes_count: likeCountMap.get(answerId) || 0,
    is_liked_by_me: likedAnswerIds.has(answerId),
  };
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
