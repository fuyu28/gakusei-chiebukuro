/**
 * HTTPステータスコード定数
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * HTTPエラーメッセージ定数
 */
export const ERROR_MESSAGES = {
  THREAD_NOT_FOUND: 'Thread not found',
  ANSWER_NOT_FOUND: 'Answer not found',
  UNAUTHORIZED: 'Unauthorized',
  DEADLINE_PASSED: 'Answer deadline has passed',
  THREAD_RESOLVED: 'Thread is already resolved',
  ONLY_OWNER_CAN_SELECT_BEST: 'Only thread owner can select best answer',
  FAILED_TO_GET_THREADS: 'Failed to get threads',
  FAILED_TO_GET_THREAD: 'Failed to get thread',
  FAILED_TO_CREATE_THREAD: 'Failed to create thread',
  FAILED_TO_UPDATE_THREAD: 'Failed to update thread',
  FAILED_TO_DELETE_THREAD: 'Failed to delete thread',
  FAILED_TO_GET_ANSWERS: 'Failed to get answers',
  FAILED_TO_CREATE_ANSWER: 'Failed to create answer',
  FAILED_TO_SELECT_BEST_ANSWER: 'Failed to select best answer',
  FAILED_TO_DELETE_ANSWER: 'Failed to delete answer',
  SUBJECT_TAG_REQUIRED: 'Subject tag is required',
  SUBJECT_TAG_NOT_FOUND: 'Subject tag not found',
  FILE_REQUIRED: 'File is required',
  INVALID_FILE_TYPE: 'Only PDF, JPEG, and PNG files are allowed',
  FILE_TOO_LARGE: 'File size exceeds the allowed limit',
  FAILED_TO_UPLOAD_FILE: 'Failed to upload file',
  FAILED_TO_GET_PAST_EXAMS: 'Failed to get past exam files',
} as const;
