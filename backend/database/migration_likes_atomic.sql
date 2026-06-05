-- total_likes をアトミックに増減するRPC関数
-- incrementProfileLikes / decrementProfileLikes の非アトミックな
-- read-modify-write を置き換える

CREATE OR REPLACE FUNCTION increment_profile_likes(p_user_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET total_likes = GREATEST(total_likes + 1, 0)
  WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION decrement_profile_likes(p_user_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET total_likes = GREATEST(total_likes - 1, 0)
  WHERE id = p_user_id;
$$;
