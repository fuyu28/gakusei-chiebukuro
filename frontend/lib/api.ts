import type {
  ThreadsResponse,
  ThreadResponse,
  AnswersResponse,
  AnswerResponse,
  TagsResponse,
  Thread,
  Answer,
  AdminUsersResponse,
  AdminUserResponse,
  AdminUser,
  PastExamListResponse,
  PastExamResponse,
  PastExamFile,
  CoinBalanceResponse,
  CoinEventsResponse,
  CoinRankingResponse,
  DailyClaimResponse,
} from '@/types';

import { apiFetch } from '@/lib/api-client';
export { signup, login, logout, getCurrentUser } from '@/lib/auth-api';

// スレッドAPI
export const fetchThreads = async (filters?: {
  status?: 'open' | 'resolved';
  subject_tag_id?: number;
  sort?: string;
  order?: string;
}): Promise<Thread[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.subject_tag_id) params.append('subject_tag_id', filters.subject_tag_id.toString());
  if (filters?.sort) params.append('sort', filters.sort);
  if (filters?.order) params.append('order', filters.order);

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiFetch<ThreadsResponse>(`/threads${query}`);
  return data.threads;
};

export const fetchThreadDetail = async (threadId: number): Promise<Thread> => {
  const data = await apiFetch<ThreadResponse>(`/threads/${threadId}`);
  return data.thread;
};

export const createThread = async (threadData: {
  title: string;
  content: string;
  subject_tag_id: number;
  deadline?: string;
  coin_stake: number;
}): Promise<Thread> => {
  const data = await apiFetch<ThreadResponse>('/threads', {
    method: 'POST',
    body: JSON.stringify(threadData),
  });
  return data.thread;
};

export const updateThread = async (threadId: number, updates: Partial<Thread>): Promise<Thread> => {
  const data = await apiFetch<ThreadResponse>(`/threads/${threadId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.thread;
};

export const deleteThread = async (threadId: number): Promise<void> => {
  await apiFetch(`/threads/${threadId}`, { method: 'DELETE' });
};

// 回答API
export const fetchAnswers = async (threadId: number): Promise<Answer[]> => {
  const data = await apiFetch<AnswersResponse>(`/answers/threads/${threadId}`);
  return data.answers;
};

export const createAnswer = async (threadId: number, content: string): Promise<Answer> => {
  const data = await apiFetch<AnswerResponse>('/answers', {
    method: 'POST',
    body: JSON.stringify({ thread_id: threadId, content }),
  });
  return data.answer;
};

export const selectBestAnswer = async (answerId: number): Promise<{ reward?: number; my_balance?: number }> => {
  const data = await apiFetch<{ reward?: number; my_balance?: number }>(`/answers/${answerId}/best`, { method: 'PATCH' });
  return data;
};

export const deleteAnswer = async (answerId: number): Promise<void> => {
  await apiFetch(`/answers/${answerId}`, { method: 'DELETE' });
};

export const likeAnswer = async (answerId: number): Promise<{ likes_count: number; is_liked_by_me: boolean }> => {
  const data = await apiFetch<{ likes_count: number; is_liked_by_me: boolean }>(`/answers/${answerId}/like`, { method: 'POST' });
  return data;
};

export const unlikeAnswer = async (answerId: number): Promise<{ likes_count: number; is_liked_by_me: boolean }> => {
  const data = await apiFetch<{ likes_count: number; is_liked_by_me: boolean }>(`/answers/${answerId}/like`, { method: 'DELETE' });
  return data;
};

// 科目タグAPI
export const fetchSubjectTags = async () => {
  const data = await apiFetch<TagsResponse>('/subject-tags');
  return data.tags;
};

// 参考資料API
export const fetchPastExams = async (subjectTagId?: number): Promise<PastExamFile[]> => {
  const params = new URLSearchParams();
  if (subjectTagId) {
    params.append('subject_tag_id', subjectTagId.toString());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiFetch<PastExamListResponse>(`/past-exams${query}`);
  return data.files;
};

export const uploadPastExam = async (formData: FormData): Promise<PastExamFile[]> => {
  const data = await apiFetch<PastExamResponse>('/past-exams', {
    method: 'POST',
    body: formData,
  });

  if (data.files && data.files.length > 0) return data.files;
  if (data.file) return [data.file];
  return [];
};

export const deletePastExam = async (pastExamId: number): Promise<void> => {
  await apiFetch(`/past-exams/${pastExamId}`, { method: 'DELETE' });
};

// コインAPI
export const fetchCoinBalance = async (): Promise<CoinBalanceResponse> => {
  return apiFetch<CoinBalanceResponse>('/coins/balance');
};

export const claimDailyCoins = async (): Promise<DailyClaimResponse> => {
  return apiFetch<DailyClaimResponse>('/coins/daily-claim', { method: 'POST' });
};

export const fetchCoinEvents = async (limit = 30): Promise<CoinEventsResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiFetch<CoinEventsResponse>(`/coins/events?${params.toString()}`);
};

export const fetchCoinRanking = async (limit = 20): Promise<CoinRankingResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiFetch<CoinRankingResponse>(`/coins/ranking?${params.toString()}`);
};

// 管理者API
export const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  const data = await apiFetch<AdminUsersResponse>('/admin/users');
  return data.users;
};

export const updateUserBanStatus = async (userId: string, isBanned: boolean): Promise<AdminUser> => {
  const data = await apiFetch<AdminUserResponse>(`/admin/users/${userId}/ban`, {
    method: 'PATCH',
    body: JSON.stringify({ is_banned: isBanned }),
  });
  return data.user;
};
