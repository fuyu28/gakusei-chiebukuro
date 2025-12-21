import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import threadsRoutes from './routes/threads';
import answersRoutes from './routes/answers';
import subjectTagsRoutes from './routes/subject-tags';
import adminRoutes from './routes/admin';
import pastExamsRoutes from './routes/past-exams';
import coinsRoutes from './routes/coins';
import { initSupabase, getEnvVar } from './lib/supabase';
import { createCsrfMiddleware } from './middleware/csrf';
import { securityHeaders } from './middleware/security-headers';

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

function getAllowedOrigins(): string[] {
  const envOrigins = (getEnvVar('CORS_ALLOW_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [...defaultOrigins, ...envOrigins];
}

app.use(
  '/*',
  cors({
    origin: (origin, _c) => {
      if (!origin) return null;
      const allowedDomains = getAllowedOrigins();
      return allowedDomains.includes(origin) ? origin : null;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// APIレスポンスのセキュリティヘッダ付与
app.use('*', securityHeaders);

// Cookie認証時のCSRF対策（Origin/Refererベース）
app.use('*', (c, next) => createCsrfMiddleware(getAllowedOrigins())(c, next));

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
app.route('/api/coins', coinsRoutes);

export default app;
