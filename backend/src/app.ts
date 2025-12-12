import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import threadsRoutes from './routes/threads';
import answersRoutes from './routes/answers';
import subjectTagsRoutes from './routes/subject-tags';
import adminRoutes from './routes/admin';
import pastExamsRoutes from './routes/past-exams';
import { initSupabase, getEnvVar } from './lib/supabase';

const app = new Hono();

// Workers環境のenvをSupabase初期化に渡す。Node開発時は何も起こらない。
app.use('*', async (c, next) => {
  const globalProcess: any = (globalThis as any).process || { env: {} };
  globalProcess.env = globalProcess.env || {};
  (globalThis as any).process = globalProcess;

  Object.assign(globalProcess.env, c.env || {});
  initSupabase(globalProcess.env);

  return next();
});

// CORS設定
const defaultOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost',
  'http://localhost:80',
  'http://localhost:8788', // wrangler pages dev
];

const envOrigins = (getEnvVar('CORS_ALLOW_ORIGINS') || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedDomains = [...defaultOrigins, ...envOrigins];

app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return false;
    if (allowedDomains.includes(origin)) return origin;
    if (origin.endsWith('.pages.dev')) return origin;
    if (origin.endsWith('.workers.dev')) return origin;
    return false;
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ヘルスチェック
app.get('/', (c) => {
  return c.json({ message: 'Gakusei Chiebukuro API', status: 'healthy' });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ルート
app.route('/api/auth', authRoutes);
app.route('/api/threads', threadsRoutes);
app.route('/api/answers', answersRoutes);
app.route('/api/subject-tags', subjectTagsRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/past-exams', pastExamsRoutes);

export default app;
