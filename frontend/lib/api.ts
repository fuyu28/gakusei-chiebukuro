import type {
  AuthResponse,
  ThreadsResponse,
  ThreadResponse,
  AnswersResponse,
  AnswerResponse,
  TagsResponse,
  UserResponse,
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

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const NORMALIZED_API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
// ベースURLに /api が付いていなければ付与する（重複を避けるための簡易ガード）
const API_BASE_URL = NORMALIZED_API_BASE_URL.endsWith('/api')
  ? NORMALIZED_API_BASE_URL
  : `${NORMALIZED_API_BASE_URL}/api`;

// 共通fetchヘルパー
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = new Headers(options.headers ?? {});
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const responseText = await response.text();
  let parsedBody: unknown = {};

  if (responseText) {
    try {
      parsedBody = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse response body', error);
      parsedBody = { message: responseText };
    }
  }

  const errorMessage = (() => {
    if (typeof parsedBody === 'object' && parsedBody !== null) {
      const body = parsedBody as { error?: string; message?: string };
      return body.error || body.message;
    }
    return undefined;
  })();

  if (!response.ok) {
    const error = new Error(errorMessage || 'API request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return parsedBody as T;
}

// 認証API
export const signup = async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
  return apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data;
};

export const logout = async (): Promise<void> => {
  await apiFetch('/auth/logout', { method: 'POST' });
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  return apiFetch<UserResponse>('/auth/me');
};

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
