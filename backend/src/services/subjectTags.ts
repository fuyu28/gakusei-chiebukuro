import { getSupabase, getSupabaseAdmin } from '../lib/supabase';
import { TABLES } from '../constants/database';
import { AppError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';
import { SubjectTag } from '../types';

export async function listSubjectTags(): Promise<SubjectTag[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.SUBJECT_TAGS)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return (data as SubjectTag[]) || [];
}

export async function createSubjectTag(name: string): Promise<SubjectTag> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(TABLES.SUBJECT_TAGS)
    .insert({ name })
    .select()
    .single();

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to create subject tag', HTTP_STATUS.BAD_REQUEST);
  }

  return data as SubjectTag;
}
