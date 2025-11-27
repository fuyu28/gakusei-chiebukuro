import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTP_STATUS } from '../constants/http';

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public status: ContentfulStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError: ErrorHandler = (error, c) => {
  console.error('Request error:', error);

  if (error instanceof AppError) {
    return c.json({ error: error.message }, error.status);
  }

  const message = error instanceof Error ? error.message : 'An error occurred';
  return c.json({ error: message }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
};
