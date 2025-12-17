import { getSupabaseAdmin } from '../lib/supabase';
import { AppError } from '../utils/errors';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { TABLES } from '../constants/database';
import { CoinBalance, CoinEvent, Thread } from '../types';

type RpcBalance = { balance: number | null; last_daily_claimed_at: string | null };
type RpcDaily = { balance: number | null; awarded: number | null; claimed: boolean | null };
type RpcReward = { reward: number | null; balance: number | null };
type RankingRow = {
  user_id: string;
  balance: number | null;
  user?: { id: string; display_name?: string | null; email?: string | null } | null;
};

const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
};

export async function getCoinBalance(userId: string): Promise<CoinBalance> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .rpc('coin_get_balance', { p_user_id: userId })
    .single<RpcBalance>();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to fetch coin balance', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    balance: toNumber(data.balance),
    last_daily_claimed_at: data.last_daily_claimed_at || null,
  };
}

export async function claimDailyBonus(userId: string): Promise<{ balance: number; awarded: number; already_claimed: boolean }> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .rpc('coin_claim_daily', { p_user_id: userId })
    .single<RpcDaily>();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to claim daily bonus', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    balance: toNumber(data.balance),
    awarded: toNumber(data.awarded),
    already_claimed: Boolean(data.claimed),
  };
}

export async function createThreadWithCoins(params: {
  user_id: string;
  title: string;
  content: string;
  subject_tag_id: number;
  deadline?: string | null;
  coin_stake: number;
}): Promise<Thread> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .rpc('coin_create_thread_with_stake', {
      p_user_id: params.user_id,
      p_title: params.title,
      p_content: params.content,
      p_subject_tag_id: params.subject_tag_id,
      p_deadline: params.deadline,
      p_stake: params.coin_stake,
    })
    .single();

  if (error || !data) {
    const message = error?.message || ERROR_MESSAGES.FAILED_TO_CREATE_THREAD;
    throw new AppError(message, HTTP_STATUS.BAD_REQUEST);
  }

  return data as Thread;
}

export async function rewardBestAnswer(params: {
  thread_id: number;
  answer_id: number;
  selector_user_id: string;
}): Promise<{ reward: number; balance: number }> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .rpc('coin_reward_best_answer', {
      p_thread_id: params.thread_id,
      p_answer_id: params.answer_id,
      p_selector_id: params.selector_user_id,
    })
    .single<RpcReward>();

  if (error || !data) {
    const message = error?.message || ERROR_MESSAGES.FAILED_TO_SELECT_BEST_ANSWER;
    throw new AppError(message, HTTP_STATUS.BAD_REQUEST);
  }

  return {
    reward: toNumber(data.reward),
    balance: toNumber(data.balance),
  };
}

export async function listCoinEvents(userId: string, limit = 30): Promise<CoinEvent[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TABLES.COIN_EVENTS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return (data || []) as CoinEvent[];
}

export async function listCoinRanking(limit = 20): Promise<Array<{ user_id: string; balance: number; display_name?: string | null; email?: string }>> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TABLES.COIN_BALANCES)
    .select(`
      user_id,
      balance,
      user:profiles(id, display_name, email)
    `)
    .order('balance', { ascending: false })
    .limit(limit);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return (data || []).map((row: any) => ({
    user_id: row.user_id,
    balance: toNumber(row.balance),
    display_name: row.user?.display_name || undefined,
    email: row.user?.email || undefined,
  }));
}
