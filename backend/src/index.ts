import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import threadsRoutes from './routes/threads';
import answersRoutes from './routes/answers';
import subjectTagsRoutes from './routes/subject-tags';
import adminRoutes from './routes/admin';

const app = new Hono();

// CORS設定
app.use('/*', cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost', 'http://localhost:80'],
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

const port = parseInt(process.env.PORT || '3000');

console.log(`Server is running on http://localhost:${port}`);

// Node.js組み込みのHTTPサーバーとして起動
import { serve } from '@hono/node-server';

serve({
  fetch: app.fetch,
  port,
});

export default app;
