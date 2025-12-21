'use client';

import { useEffect, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { useCoinData } from '@/hooks/use-coin';

export const runtime = 'edge';

export default function MePage() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { balance, events, loading, error, refresh, claimDaily } = useCoinData();

  const isClaimedToday = useMemo(() => {
    if (!balance?.last_daily_claimed_at) return false;
    const last = new Date(balance.last_daily_claimed_at);
    const now = new Date();
    return last.getFullYear() === now.getFullYear()
      && last.getMonth() === now.getMonth()
      && last.getDate() === now.getDate();
  }, [balance?.last_daily_claimed_at]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
  }, [isAuthenticated, refresh]);

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
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
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
            <Button onClick={claimDaily} disabled={loading || isClaimedToday}>
              {loading ? '処理中...' : isClaimedToday ? '受取済' : 'デイリーを受け取る'}
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
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
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
