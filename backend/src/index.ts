import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './app';
import { initSupabase } from './lib/supabase';

const port = parseInt(process.env.PORT || '3000');
const isBun = typeof (globalThis as any).Bun !== 'undefined';

// ローカル開発のために事前初期化
initSupabase(process.env);

// Bun環境ではdefault exportをBun.serveが自動で処理するので手動起動しない。
if (!isBun) {
  console.log(`Server is running on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
} else {
  // Bun側の自動起動に任せる
  console.log(`Server will be started by Bun on http://localhost:${port}`);
}

export default app;
