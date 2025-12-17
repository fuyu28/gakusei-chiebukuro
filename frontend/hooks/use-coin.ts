import { useCallback, useState } from 'react';
import { claimDailyCoins, fetchCoinBalance, fetchCoinEvents } from '@/lib/api';
import type { CoinBalance, CoinEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';

type UseCoinResult = {
  balance: CoinBalance | null;
  events: CoinEvent[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  claimDaily: () => Promise<void>;
};

export function useCoinData(): UseCoinResult {
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [events, setEvents] = useState<CoinEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [balanceRes, eventsRes] = await Promise.all([
        fetchCoinBalance(),
        fetchCoinEvents(20),
      ]);
      setBalance(balanceRes.balance);
      setEvents(eventsRes.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      toast({
        variant: 'destructive',
        title: '読み込みに失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const claimDaily = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { result } = await claimDailyCoins();
      const message = result.awarded > 0
        ? `デイリー配布で ${result.awarded} コインを受け取りました`
        : '本日のデイリー配布は受け取り済みです';
      toast({ description: message });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'デイリー受取に失敗しました');
      toast({
        variant: 'destructive',
        title: 'デイリー受取に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [refresh, toast]);

  return { balance, events, loading, error, refresh, claimDaily };
}
