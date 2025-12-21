// ユーザー型
export interface User {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
  is_admin?: boolean;
  is_banned?: boolean;
  total_likes?: number;
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
  coin_stake?: number;
  coin_fee?: number;
  coin_reward_amount?: number;
  coin_reward_paid?: boolean;
  coin_reward_paid_at?: string | null;
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
  likes_count?: number;
  is_liked_by_me?: boolean;
}

export interface PastExamFile {
  id: number;
  subject_tag_id: number;
  title: string;
  file_path: string;
  file_type: string;
  file_size?: number | null;
  uploaded_by: string;
  created_at: string;
  download_url?: string;
  subject_tag?: SubjectTag;
  uploader?: User;
}

// 科目タグ型
export interface SubjectTag {
  id: number;
  name: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
  is_banned: boolean;
}

// API レスポンス型
export interface AuthResponse {
  access_token?: string;
  user: User;
  message?: string;
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

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface AdminUserResponse {
  user: AdminUser;
  message: string;
}

export interface PastExamListResponse {
  files: PastExamFile[];
}

export interface PastExamResponse {
  file?: PastExamFile;
  files?: PastExamFile[];
  message?: string;
}

export interface CoinBalance {
  balance: number;
  last_daily_claimed_at?: string | null;
}

export type CoinEventReason =
  | 'signup_bonus'
  | 'daily_bonus'
  | 'question_spent'
  | 'best_answer_reward'
  | 'admin_adjust';

export interface CoinEvent {
  id: number;
  user_id: string;
  delta: number;
  reason: CoinEventReason;
  thread_id?: number | null;
  answer_id?: number | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CoinBalanceResponse {
  balance: CoinBalance;
}

export interface CoinEventsResponse {
  events: CoinEvent[];
}

export interface CoinRankingEntry {
  user_id: string;
  balance: number;
  display_name?: string | null;
  email?: string;
}

export interface CoinRankingResponse {
  ranking: CoinRankingEntry[];
}

export interface DailyClaimResponse {
  result: {
    balance: number;
    awarded: number;
    already_claimed: boolean;
  };
}
