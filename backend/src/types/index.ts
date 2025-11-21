export interface User {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
  is_banned?: boolean;
  is_admin?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  is_admin?: boolean;
  is_banned?: boolean;
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
