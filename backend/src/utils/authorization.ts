import { getSupabase } from '../lib/supabase';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/http';
import { TABLES } from '../constants/database';
import { AppError } from './errors';

/**
 * リソースの所有権を検証する
 * @param table テーブル名
 * @param id リソースID
 * @param userId ユーザーID
 * @returns リソースデータ
 * @throws {AppError} リソースが見つからない、または権限がない場合
 */
export async function verifyOwnership(
  table: typeof TABLES[keyof typeof TABLES],
  id: number,
  userId: string
): Promise<{ user_id: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .select('user_id')
    .eq('id', id)
    .single();

  if (error || !data) {
    const errorMessage = table === TABLES.THREADS
      ? ERROR_MESSAGES.THREAD_NOT_FOUND
      : ERROR_MESSAGES.ANSWER_NOT_FOUND;
    throw new AppError(errorMessage, HTTP_STATUS.NOT_FOUND);
  }

  if (data.user_id !== userId) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN);
  }

  return data;
}
