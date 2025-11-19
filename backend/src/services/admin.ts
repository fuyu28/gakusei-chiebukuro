import { supabaseAdmin } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { AppError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';
import { AdminUserSummary } from '../types';
import { isAdminEmail } from '../utils/admin';

const PROFILE_FIELDS = 'id, email, display_name, created_at, is_banned';

export async function listAllUsers(): Promise<AdminUserSummary[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.PROFILES)
    .select(PROFILE_FIELDS)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return (data as AdminUserSummary[]) || [];
}

export async function updateUserBanStatus(userId: string, isBanned: boolean): Promise<AdminUserSummary> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from(TABLES.PROFILES)
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .single();

  if (fetchError || !existing) {
    throw new AppError(fetchError?.message || 'User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (isAdminEmail(existing.email)) {
    throw new AppError('Cannot ban administrator accounts', HTTP_STATUS.BAD_REQUEST);
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.PROFILES)
    .update({ is_banned: isBanned })
    .eq('id', userId)
    .select(PROFILE_FIELDS)
    .single();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to update user', HTTP_STATUS.BAD_REQUEST);
  }

  return data as AdminUserSummary;
}
