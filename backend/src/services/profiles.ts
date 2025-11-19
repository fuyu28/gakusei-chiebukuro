import { supabase, supabaseAdmin } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { AppError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';

const PROFILE_FIELDS = 'id, email, display_name, created_at, is_banned';

export type UserProfile = {
  id: string;
  email: string;
  display_name?: string | null;
  created_at?: string;
  is_banned?: boolean | null;
};

export async function findProfileById(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLES.PROFILES)
    .select(PROFILE_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new AppError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return (data as UserProfile) || null;
}

export async function ensureUserProfile(params: {
  id: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<UserProfile> {
  const existing = await findProfileById(params.id);
  if (existing) {
    return existing;
  }

  const fallbackDisplayName =
    params.displayName || params.email?.split('@')[0] || 'User';

  const { data, error } = await supabaseAdmin
    .from(TABLES.PROFILES)
    .insert({
      id: params.id,
      email: params.email,
      display_name: fallbackDisplayName,
    })
    .select(PROFILE_FIELDS)
    .single();

  if (error || !data) {
    throw new AppError(
      error?.message || 'Failed to create profile',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return data as UserProfile;
}
