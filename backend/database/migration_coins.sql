-- Coin system migration

-- Fix past_exam_files FK name collision (idempotent)
ALTER TABLE past_exam_files
  DROP CONSTRAINT IF EXISTS past_exam_files_uploaded_by_fkey,
  DROP CONSTRAINT IF EXISTS past_exam_files_uploaded_by_profiles_fkey,
  ADD CONSTRAINT past_exam_files_uploaded_by_profiles_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Threads: coin-related columns
ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS coin_stake BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coin_fee BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coin_reward_amount BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coin_reward_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coin_reward_paid_at TIMESTAMPTZ;

-- Coin settings
CREATE TABLE IF NOT EXISTS coin_settings (
  id SERIAL PRIMARY KEY,
  signup_bonus BIGINT NOT NULL DEFAULT 20,
  daily_bonus BIGINT NOT NULL DEFAULT 5,
  min_question_cost BIGINT NOT NULL DEFAULT 1,
  max_stake BIGINT NOT NULL DEFAULT 1000,
  fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
  fee_fixed BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO coin_settings (id, signup_bonus, daily_bonus, min_question_cost, max_stake, fee_percent, fee_fixed)
VALUES (1, 20, 5, 1, 1000, 10.0, 0)
ON CONFLICT (id) DO NOTHING;

-- User balances
CREATE TABLE IF NOT EXISTS user_coin_balances (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  balance BIGINT NOT NULL DEFAULT 0,
  last_daily_claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coin events
CREATE TABLE IF NOT EXISTS user_coin_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  delta BIGINT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'signup_bonus',
    'daily_bonus',
    'question_spent',
    'best_answer_reward',
    'admin_adjust'
  )),
  thread_id INTEGER REFERENCES threads(id) ON DELETE SET NULL,
  answer_id INTEGER REFERENCES answers(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_coin_events_user_id_created_at ON user_coin_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_coin_balance_balance ON user_coin_balances(balance DESC);

-- Enable RLS
ALTER TABLE coin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coin_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coin_events ENABLE ROW LEVEL SECURITY;

-- Policies (drop-if-exists for idempotency)
DROP POLICY IF EXISTS "Coin settings read for service role" ON coin_settings;
CREATE POLICY "Coin settings read for service role" ON coin_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Coin balance readable by owner" ON user_coin_balances;
CREATE POLICY "Coin balance readable by owner" ON user_coin_balances
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coin balance writable by owner" ON user_coin_balances;
CREATE POLICY "Coin balance writable by owner" ON user_coin_balances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coin balance updatable by owner" ON user_coin_balances;
CREATE POLICY "Coin balance updatable by owner" ON user_coin_balances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coin events readable by owner" ON user_coin_events;
CREATE POLICY "Coin events readable by owner" ON user_coin_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coin events insertable by owner" ON user_coin_events;
CREATE POLICY "Coin events insertable by owner" ON user_coin_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION coin_get_settings()
RETURNS coin_settings AS $$
DECLARE
  settings coin_settings;
BEGIN
  SELECT * INTO settings FROM coin_settings ORDER BY id LIMIT 1;
  IF NOT FOUND THEN
    settings.signup_bonus := 20;
    settings.daily_bonus := 5;
    settings.min_question_cost := 1;
    settings.max_stake := 1000;
    settings.fee_percent := 10.0;
    settings.fee_fixed := 0;
  END IF;
  RETURN settings;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION coin_get_balance(p_user_id uuid)
RETURNS TABLE(balance BIGINT, last_daily_claimed_at TIMESTAMPTZ) AS $$
DECLARE
  settings coin_settings;
  existing user_coin_balances;
BEGIN
  settings := coin_get_settings();

  SELECT * INTO existing FROM user_coin_balances WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO user_coin_balances(user_id, balance, created_at, updated_at)
    VALUES (p_user_id, settings.signup_bonus, NOW(), NOW())
    RETURNING * INTO existing;

    INSERT INTO user_coin_events(user_id, delta, reason, metadata)
    VALUES (p_user_id, settings.signup_bonus, 'signup_bonus', jsonb_build_object('source', 'auto_init'));
  END IF;

  RETURN QUERY SELECT existing.balance, existing.last_daily_claimed_at;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION coin_claim_daily(p_user_id uuid)
RETURNS TABLE(balance BIGINT, awarded BIGINT, claimed BOOLEAN) AS $$
DECLARE
  settings coin_settings;
  existing user_coin_balances;
BEGIN
  settings := coin_get_settings();
  SELECT * INTO existing FROM user_coin_balances WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM coin_get_balance(p_user_id);
    SELECT * INTO existing FROM user_coin_balances WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF existing.last_daily_claimed_at::date = NOW()::date THEN
    RETURN QUERY SELECT existing.balance, 0::BIGINT, TRUE;
    RETURN;
  END IF;

  UPDATE user_coin_balances AS b
    SET balance = b.balance + settings.daily_bonus,
        last_daily_claimed_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO existing;

  INSERT INTO user_coin_events(user_id, delta, reason, metadata)
  VALUES (p_user_id, settings.daily_bonus, 'daily_bonus', jsonb_build_object('date', NOW()::date));

  RETURN QUERY SELECT existing.balance, settings.daily_bonus, FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION coin_create_thread_with_stake(
  p_user_id uuid,
  p_title TEXT,
  p_content TEXT,
  p_subject_tag_id INTEGER,
  p_deadline TIMESTAMPTZ,
  p_stake BIGINT
) RETURNS threads AS $$
DECLARE
  settings coin_settings;
  balance_row user_coin_balances;
  fee_from_percent BIGINT;
  fee_amount BIGINT;
  reward_amount BIGINT;
  inserted threads;
BEGIN
  settings := coin_get_settings();

  IF p_stake IS NULL OR p_stake < settings.min_question_cost THEN
    RAISE EXCEPTION 'Stake must be at least % coins', settings.min_question_cost USING ERRCODE = 'P0001';
  END IF;

  IF p_stake > settings.max_stake THEN
    RAISE EXCEPTION 'Stake exceeds max % coins', settings.max_stake USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO balance_row FROM user_coin_balances WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM coin_get_balance(p_user_id);
    SELECT * INTO balance_row FROM user_coin_balances WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF balance_row.balance < p_stake THEN
    RAISE EXCEPTION 'Insufficient coins' USING ERRCODE = 'P0001';
  END IF;

  fee_from_percent := FLOOR(p_stake * settings.fee_percent / 100)::BIGINT;
  fee_amount := GREATEST(fee_from_percent, settings.fee_fixed);
  IF fee_amount > p_stake THEN
    fee_amount := p_stake;
  END IF;

  reward_amount := p_stake - fee_amount;

  UPDATE user_coin_balances AS b
    SET balance = b.balance - p_stake,
        updated_at = NOW()
    WHERE user_id = p_user_id;

  INSERT INTO threads(title, content, subject_tag_id, deadline, user_id, coin_stake, coin_fee, coin_reward_amount)
  VALUES (p_title, p_content, p_subject_tag_id, p_deadline, p_user_id, p_stake, fee_amount, reward_amount)
  RETURNING * INTO inserted;

  INSERT INTO user_coin_events(user_id, delta, reason, thread_id, metadata)
  VALUES (
    p_user_id,
    -p_stake,
    'question_spent',
    inserted.id,
    jsonb_build_object(
      'stake', p_stake,
      'fee', fee_amount,
      'reward_estimate', reward_amount
    )
  );

  RETURN inserted;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION coin_reward_best_answer(
  p_thread_id INTEGER,
  p_answer_id INTEGER,
  p_selector_id UUID
) RETURNS TABLE(reward BIGINT, balance BIGINT) AS $$
DECLARE
  t threads;
  a answers;
  target_balance user_coin_balances;
  settings coin_settings;
BEGIN
  settings := coin_get_settings();

  SELECT * INTO t FROM threads WHERE id = p_thread_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Thread not found' USING ERRCODE = 'P0001';
  END IF;

  IF t.user_id <> p_selector_id THEN
    RAISE EXCEPTION 'Only thread owner can select best answer' USING ERRCODE = 'P0001';
  END IF;

  IF t.coin_reward_paid THEN
    RAISE EXCEPTION 'Reward already distributed' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO a FROM answers WHERE id = p_answer_id AND thread_id = p_thread_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Answer not found in thread' USING ERRCODE = 'P0001';
  END IF;

  reward := GREATEST(t.coin_reward_amount, 0);

  SELECT * INTO target_balance FROM user_coin_balances WHERE user_id = a.user_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM coin_get_balance(a.user_id);
    SELECT * INTO target_balance FROM user_coin_balances WHERE user_id = a.user_id FOR UPDATE;
  END IF;

  UPDATE user_coin_balances AS b
    SET balance = b.balance + reward,
        updated_at = NOW()
    WHERE user_id = a.user_id
    RETURNING * INTO target_balance;

  INSERT INTO user_coin_events(user_id, delta, reason, thread_id, answer_id, metadata)
  VALUES (
    a.user_id,
    reward,
    'best_answer_reward',
    p_thread_id,
    p_answer_id,
    jsonb_build_object('source_thread', p_thread_id)
  );

  UPDATE answers
    SET is_best_answer = (id = p_answer_id),
        updated_at = NOW()
    WHERE thread_id = p_thread_id;

  UPDATE threads
    SET status = 'resolved',
        coin_reward_paid = TRUE,
        coin_reward_paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_thread_id;

  RETURN QUERY SELECT reward, target_balance.balance;
END;
$$ LANGUAGE plpgsql;
