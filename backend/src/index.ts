import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import threadsRoutes from './routes/threads';
import answersRoutes from './routes/answers';
import subjectTagsRoutes from './routes/subject-tags';

const app = new Hono();

// CORS設定
app.use('/*', cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
}));

// ヘルスチェック
app.get('/', (c) => {
  return c.json({ message: 'Gakusei Chiebukuro API', status: 'healthy' });
});

// ルート
app.route('/api/auth', authRoutes);
app.route('/api/threads', threadsRoutes);
app.route('/api/answers', answersRoutes);
app.route('/api/subject-tags', subjectTagsRoutes);

const port = parseInt(process.env.PORT || '3000');

console.log(`Server is running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
