import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from './index';

export type EnvBindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_PAST_EXAM_BUCKET?: string;
  ALLOWED_EMAIL_DOMAIN?: string;
  REQUIRE_EMAIL_VERIFICATION?: string;
  EMAIL_REDIRECT_TO?: string;
  ADMIN_EMAILS?: string;
};

export type AppVariables = {
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  allowedEmailDomain: string;
  adminEmails: string[];
  user?: AuthUser;
};

export type AppEnv = {
  Bindings: EnvBindings;
  Variables: AppVariables;
};
