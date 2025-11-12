import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase, supabaseAdmin, isAllowedEmailDomain } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';

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
auth.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, password, display_name } = c.req.valid('json');

  // メールドメインチェック
  if (!isAllowedEmailDomain(email)) {
    return c.json(
      { error: 'Only @ccmailg.meijo-u.ac.jp email addresses are allowed' },
      400
    );
  }

  try {
    // Supabase Authでユーザー作成
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // 本番環境では true にしてメール認証を有効化
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    // プロフィール作成
    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          display_name: display_name || email.split('@')[0],
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return c.json({
      message: 'User created successfully',
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// ログイン
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    return c.json({
      message: 'Login successful',
      access_token: data.session?.access_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// ログアウト
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// 現在のユーザー情報取得
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name,
        created_at: profile?.created_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

export default auth;
