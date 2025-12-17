'use client';

import { useCallback, useEffect, useState } from 'react';
import { claimDailyCoins, fetchCoinBalance, fetchCoinEvents } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { CoinBalance, CoinEvent } from '@/types';
import { formatDate } from '@/lib/utils';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

export default function MePage() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [events, setEvents] = useState<CoinEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setError('');
    try {
      setLoading(true);
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

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadData();
  }, [isAuthenticated, loadData]);

  const handleClaimDaily = async () => {
    setError('');
    setClaiming(true);
    try {
      const { result } = await claimDailyCoins();
      const message = result.awarded > 0
        ? `デイリー配布で ${result.awarded} コインを受け取りました`
        : '本日のデイリー配布は受け取り済みです';
      toast({ description: message });
      // 受取結果を反映するため再取得
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'デイリー受取に失敗しました');
      toast({
        variant: 'destructive',
        title: 'デイリー受取に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <LoadingIndicator />
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-2xl">マイページ</CardTitle>
            <p className="text-sm text-muted-foreground">コイン残高の確認とデイリー受取ができます</p>
          </div>
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            残高を更新
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">保有コイン</div>
            <div className="text-3xl font-bold">
              {balance ? balance.balance : '...'} <span className="text-base font-semibold">枚</span>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">最終デイリー受取</div>
            <div className="text-lg font-semibold">
              {balance?.last_daily_claimed_at ? formatDate(balance.last_daily_claimed_at) : '未受取または不明'}
            </div>
          </div>
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            <div className="text-sm text-muted-foreground">デイリー配布</div>
            <Button onClick={handleClaimDaily} disabled={claiming}>
              {claiming ? '受取中...' : 'デイリーを受け取る'}
            </Button>
            <p className="text-xs text-muted-foreground">
              1日1回受け取れます。受け取り後は最新の残高で更新してください。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">コイン履歴</CardTitle>
            <p className="text-sm text-muted-foreground">直近20件を表示</p>
          </div>
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            更新
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <LoadingIndicator />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground">
              履歴がありません
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="flex flex-wrap items-center justify-between rounded-lg border p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ev.reason}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ev.thread_id ? `thread #${ev.thread_id}` : ''}
                      {ev.answer_id ? ` / answer #${ev.answer_id}` : ''}
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${ev.delta >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {ev.delta >= 0 ? `+${ev.delta}` : ev.delta} 枚
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
