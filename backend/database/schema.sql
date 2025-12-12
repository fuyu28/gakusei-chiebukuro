-- プロフィールテーブル（Supabase Auth連携）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- 科目タグマスタ
CREATE TABLE IF NOT EXISTS subject_tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- スレッド
CREATE TABLE IF NOT EXISTS threads (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  subject_tag_id INTEGER REFERENCES subject_tags(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  deadline TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 回答
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_best_answer BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 過去問ファイル
CREATE TABLE IF NOT EXISTS past_exam_files (
  id SERIAL PRIMARY KEY,
  subject_tag_id INTEGER REFERENCES subject_tags(id) NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 外部キー（profiles への参照）
ALTER TABLE past_exam_files
  DROP CONSTRAINT IF EXISTS past_exam_files_uploaded_by_fkey,
  ADD CONSTRAINT past_exam_files_uploaded_by_profiles_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_subject_tag_id ON threads(subject_tag_id);
CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_thread_id ON answers(thread_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_past_exam_files_subject_tag_id ON past_exam_files(subject_tag_id);
CREATE INDEX IF NOT EXISTS idx_past_exam_files_created_at ON past_exam_files(created_at DESC);

-- Row Level Security (RLS) ポリシー
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_exam_files ENABLE ROW LEVEL SECURITY;

-- profiles: 全員が読み取り可能、自分のみ更新可能
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- threads: 全員が読み取り可能、認証ユーザーが作成可能、自分のみ更新可能
CREATE POLICY "Threads are viewable by everyone"
  ON threads FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads"
  ON threads FOR UPDATE
  USING (auth.uid() = user_id);

-- answers: 全員が読み取り可能、認証ユーザーが作成可能
CREATE POLICY "Answers are viewable by everyone"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create answers"
  ON answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
  ON answers FOR UPDATE
  USING (auth.uid() = user_id);

-- subject_tags: 全員が読み取り可能、管理者のみ作成可能（後で設定）
CREATE POLICY "Subject tags are viewable by everyone"
  ON subject_tags FOR SELECT
  USING (true);

CREATE POLICY "Past exam files are viewable by everyone"
  ON past_exam_files FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add past exam files"
  ON past_exam_files FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 初期データ（科目タグのサンプル）
INSERT INTO subject_tags (name) VALUES
  ('プログラミング基礎'),
  ('データ構造とアルゴリズム'),
  ('データベース'),
  ('ネットワーク'),
  ('ソフトウェア工学'),
  ('オペレーティングシステム'),
  ('Web開発'),
  ('人工知能'),
  ('機械学習'),
  ('線形代数'),
  ('微分積分'),
  ('統計学'),
  ('離散数学'),
  ('英語'),
  ('その他')
ON CONFLICT (name) DO NOTHING;

-- いいね機能
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS answer_likes (
  id SERIAL PRIMARY KEY,
  answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(answer_id, user_id)
);

ALTER TABLE answer_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Answer likes are viewable by everyone"
  ON answer_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like answers"
  ON answer_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON answer_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_answer_likes_answer_id ON answer_likes(answer_id);
CREATE INDEX IF NOT EXISTS idx_answer_likes_user_id ON answer_likes(user_id);
