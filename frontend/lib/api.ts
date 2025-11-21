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
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// トークン管理
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
};

export const isLoggedIn = (): boolean => {
  return !!getAuthToken();
};

// 共通fetchヘルパー
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = new Headers(options.headers ?? {});
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
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
    throw new Error(errorMessage || 'API request failed');
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

  if (data.access_token) {
    setAuthToken(data.access_token);
  }

  return data;
};

export const logout = async (): Promise<void> => {
  await apiFetch('/auth/logout', { method: 'POST' });
  clearAuthToken();
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

export const selectBestAnswer = async (answerId: number): Promise<void> => {
  await apiFetch(`/answers/${answerId}/best`, { method: 'PATCH' });
};

export const deleteAnswer = async (answerId: number): Promise<void> => {
  await apiFetch(`/answers/${answerId}`, { method: 'DELETE' });
};

// 科目タグAPI
export const fetchSubjectTags = async () => {
  const data = await apiFetch<TagsResponse>('/subject-tags');
  return data.tags;
};

// 過去問API
export const fetchPastExams = async (subjectTagId?: number): Promise<PastExamFile[]> => {
  const params = new URLSearchParams();
  if (subjectTagId) {
    params.append('subject_tag_id', subjectTagId.toString());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiFetch<PastExamListResponse>(`/past-exams${query}`);
  return data.files;
};

export const uploadPastExam = async (formData: FormData): Promise<PastExamFile> => {
  const data = await apiFetch<PastExamResponse>('/past-exams', {
    method: 'POST',
    body: formData,
  });

  return data.file;
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
