import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// クライアント用（ユーザー認証）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サービスロール用（管理操作）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// メールドメインチェック
export const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'ccmailg.meijo-u.ac.jp';

export function isAllowedEmailDomain(email: string): boolean {
  return email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

// ユーザーのJWTを付けてRLSを通すためのクライアント生成
export function createClientWithToken(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
