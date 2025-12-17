import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/errors';
import { claimDailyBonus, getCoinBalance, listCoinEvents, listCoinRanking } from '../services/coins';
import { AuthUser } from '../types';

const coins = new Hono();

// 残高取得
coins.get('/balance', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const balance = await getCoinBalance(user.id);
  return c.json({ balance });
}));

// デイリーボーナス受取
coins.post('/daily-claim', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const result = await claimDailyBonus(user.id);
  return c.json({ result });
}));

// 履歴取得
const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

coins.get(
  '/events',
  authMiddleware,
  asyncHandler(async (c) => {
    const user = c.get('user') as AuthUser;
    const { limit } = eventsQuerySchema.parse({ limit: c.req.query('limit') });
    const events = await listCoinEvents(user.id, limit ?? 30);
    return c.json({ events });
  })
);

// ランキング
const rankingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

coins.get(
  '/ranking',
  asyncHandler(async (c) => {
    const { limit } = rankingQuerySchema.parse({ limit: c.req.query('limit') });
    const ranking = await listCoinRanking(limit);
    return c.json({ ranking });
  })
);

export default coins;
