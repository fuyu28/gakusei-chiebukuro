import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
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
coins.get('/events', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user') as AuthUser;
  const limitParam = parseInt(c.req.query('limit') || '30', 10);
  const limit = Number.isNaN(limitParam) ? 30 : Math.min(Math.max(limitParam, 1), 100);
  const events = await listCoinEvents(user.id, limit);
  return c.json({ events });
}));

// ランキング
coins.get('/ranking', zValidator('query', z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})), asyncHandler(async (c) => {
  const { limit } = c.req.valid('query');
  const ranking = await listCoinRanking(limit);
  return c.json({ ranking });
}));

export default coins;
