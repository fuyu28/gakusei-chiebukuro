import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getSupabase, getEnvVar, isAllowedEmailDomain } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError } from '../utils/errors';
import { HTTP_STATUS } from '../constants/http';
import { AuthUser } from '../types';
import { ensureUserProfile } from '../services/profiles';

const auth = new Hono();

// サインアップスキーマ
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().optional(),
});

// ログインスキーマ
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// サインアップ
auth.post('/signup', zValidator('json', signupSchema), asyncHandler(async (c: any) => {
  const supabase = getSupabase();
  const { email, password, display_name } = c.req.valid('json');

  // メールドメインチェック
  if (!isAllowedEmailDomain(email)) {
    throw new AppError(
      'Only @ccmailg.meijo-u.ac.jp email addresses are allowed',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const requireEmailVerification = getEnvVar('REQUIRE_EMAIL_VERIFICATION') !== 'false';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEnvVar('EMAIL_REDIRECT_TO') || undefined,
      data: {
        display_name: display_name || (email as string).split('@')[0],
      },
    },
  });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  if (!data.user) {
    throw new AppError('Failed to create user', HTTP_STATUS.BAD_REQUEST);
  }

  await ensureUserProfile({
    id: data.user.id,
    email,
    displayName: display_name || (email as string).split('@')[0],
  });

  return c.json({
    message: requireEmailVerification
      ? 'User created successfully. Please check your email to confirm.'
      : 'User created successfully',
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}));

// ログイン
auth.post('/login', zValidator('json', loginSchema), asyncHandler(async (c: any) => {
  const supabase = getSupabase();
  const { email, password } = c.req.valid('json');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.UNAUTHORIZED);
  }

  return c.json({
    message: 'Login successful',
    access_token: data.session?.access_token,
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  });
}));

// ログアウト
auth.post('/logout', authMiddleware, asyncHandler(async (c) => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return c.json({ message: 'Logout successful' });
}));

// 現在のユーザー情報取得
auth.get('/me', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;

  const profile = await ensureUserProfile({
    id: user.id,
    email: user.email,
  });

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      display_name: profile?.display_name,
      created_at: profile?.created_at,
      is_banned: profile?.is_banned ?? false,
      is_admin: user.is_admin ?? false,
      total_likes: profile?.total_likes || 0,
    },
  });
}));

export default auth;
