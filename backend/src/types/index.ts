export interface User {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
  is_banned?: boolean;
  is_admin?: boolean;
  total_likes?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  is_admin?: boolean;
  is_banned?: boolean;
  total_likes?: number;
}

export interface SubjectTag {
  id: number;
  name: string;
  created_at: string;
}

export interface Thread {
  id: number;
  title: string;
  content: string;
  subject_tag_id: number;
  status: 'open' | 'resolved';
  deadline?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  coin_stake?: number;
  coin_fee?: number;
  coin_reward_amount?: number;
  coin_reward_paid?: boolean;
  coin_reward_paid_at?: string | null;
}

export interface Answer {
  id: number;
  thread_id: number;
  content: string;
  is_best_answer: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
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
}

export interface ThreadWithDetails extends Thread {
  subject_tag?: SubjectTag;
  user?: {
    id: string;
    email: string;
    display_name?: string;
  };
  answers_count?: number;
}

export interface AnswerWithUser extends Answer {
  user?: {
    id: string;
    email: string;
    display_name?: string;
  };
  likes_count?: number;
  is_liked_by_me?: boolean;
}

export interface PastExamFileWithRelations extends PastExamFile {
  subject_tag?: SubjectTag;
  uploader?: {
    id: string;
    email: string;
    display_name?: string;
  };
  download_url?: string;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
  is_banned: boolean;
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
