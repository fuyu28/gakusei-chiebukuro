import { Context } from 'hono';
import { HTTP_STATUS } from '../constants/http';

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 非同期ルートハンドラーをラップしてエラーハンドリングを共通化
 */
export function asyncHandler<T extends Context = Context>(
  fn: (c: T) => Promise<Response>
) {
  return async (c: T) => {
    try {
      return await fn(c);
    } catch (error) {
      console.error('Request error:', error);

      if (error instanceof AppError) {
        return c.json({ error: error.message }, error.status as any);
      }

      const message = error instanceof Error ? error.message : 'An error occurred';
      return c.json({ error: message }, HTTP_STATUS.INTERNAL_SERVER_ERROR as any);
    }
  };
}
