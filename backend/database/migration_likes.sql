-- Add total_likes to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0;

-- Create answer_likes table
CREATE TABLE IF NOT EXISTS answer_likes (
  id SERIAL PRIMARY KEY,
  answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(answer_id, user_id)
);

-- Enable RLS for answer_likes
ALTER TABLE answer_likes ENABLE ROW LEVEL SECURITY;

-- Policies for answer_likes
CREATE POLICY "Answer likes are viewable by everyone"
  ON answer_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like answers"
  ON answer_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON answer_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_answer_likes_answer_id ON answer_likes(answer_id);
CREATE INDEX IF NOT EXISTS idx_answer_likes_user_id ON answer_likes(user_id);
