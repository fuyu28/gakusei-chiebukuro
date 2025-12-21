const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const NORMALIZED_API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const API_BASE_URL = NORMALIZED_API_BASE_URL.endsWith('/api')
  ? NORMALIZED_API_BASE_URL
  : `${NORMALIZED_API_BASE_URL}/api`;

const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'csrf_token';
const CSRF_HEADER_NAME = process.env.NEXT_PUBLIC_CSRF_HEADER_NAME || 'X-CSRF-Token';

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split('=')[1];
  return token ? decodeURIComponent(token) : null;
}

function isUnsafeMethod(method?: string): boolean {
  const normalized = (method || 'GET').toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(normalized);
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = new Headers(options.headers ?? {});
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (isUnsafeMethod(options.method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const responseText = await response.text();
  let parsedBody: unknown = {};

  if (responseText) {
    try {
      parsedBody = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse response body', error);
      parsedBody = { message: responseText };
    }
  }

  const errorMessage = (() => {
    if (typeof parsedBody === 'object' && parsedBody !== null) {
      const body = parsedBody as { error?: string; message?: string };
      return body.error || body.message;
    }
    return undefined;
  })();

  if (!response.ok) {
    const error = new Error(errorMessage || 'API request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return parsedBody as T;
}
