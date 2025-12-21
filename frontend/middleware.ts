import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getApiOrigin(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return apiBaseUrl;
  }
}

function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function middleware(request: NextRequest) {
  const nonce = createNonce();
  const apiOrigin = getApiOrigin();
  const isDev = process.env.NODE_ENV !== 'production';

  const cspDirectives = [
    "default-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`.trim(),
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspDirectives);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', cspDirectives);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
