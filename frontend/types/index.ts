// ユーザー型
export interface User {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
}

// スレッド型
export interface Thread {
  id: number;
  title: string;
  content: string;
  status: 'open' | 'resolved';
  user_id: string;
  subject_tag_id: number;
  deadline?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  subject_tag?: SubjectTag;
  answers_count?: number;
}

// 回答型
export interface Answer {
  id: number;
  content: string;
  thread_id: number;
  user_id: string;
  is_best_answer: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}

// 科目タグ型
export interface SubjectTag {
  id: number;
  name: string;
  created_at: string;
}

// API レスポンス型
export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ThreadsResponse {
  threads: Thread[];
}

export interface ThreadResponse {
  thread: Thread;
}

export interface AnswersResponse {
  answers: Answer[];
}

export interface AnswerResponse {
  answer: Answer;
}

export interface TagsResponse {
  tags: SubjectTag[];
}

export interface UserResponse {
  user: User;
}
