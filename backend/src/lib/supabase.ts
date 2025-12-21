import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnv = Record<string, string | undefined>;

let cachedEnv: SupabaseEnv = {};
let supabaseUrl = '';
let supabaseAnonKey = '';
let supabaseServiceRoleKey = '';
let supabase: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;
let allowedEmailDomain = 'ccmailg.meijo-u.ac.jp';

function mergeEnv(env: SupabaseEnv): SupabaseEnv {
  cachedEnv = { ...cachedEnv, ...env };
  return cachedEnv;
}

export function initSupabase(env: SupabaseEnv = {}): void {
  if (supabase && supabaseAdmin) {
    mergeEnv(env);
    return;
  }

  const mergedEnv = mergeEnv(env);

  supabaseUrl = mergedEnv.SUPABASE_URL || '';
  supabaseAnonKey = mergedEnv.SUPABASE_ANON_KEY || '';
  supabaseServiceRoleKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY || '';
  allowedEmailDomain = mergedEnv.ALLOWED_EMAIL_DOMAIN || 'ccmailg.meijo-u.ac.jp';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);
}

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
  return supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not initialized');
  }
  return supabaseAdmin;
}

export function getAllowedEmailDomain(): string {
  return allowedEmailDomain;
}

export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return cachedEnv[key] ?? defaultValue;
}

// ユーザーのJWTを付けてRLSを通すためのクライアント生成
export function createClientWithToken(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase client is not initialized');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export function isAllowedEmailDomain(email: string): boolean {
  return email.endsWith(`@${allowedEmailDomain}`);
}
