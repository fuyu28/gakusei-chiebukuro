'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchThreadDetail,
  fetchAnswers,
  createAnswer,
  selectBestAnswer,
  deleteAnswer,
  updateThread,
  likeAnswer,
  unlikeAnswer,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Thread, Answer } from '@/types';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

export const runtime = 'edge';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = Number(params.id);

  const [thread, setThread] = useState<Thread | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerContent, setAnswerContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likeLoadingIds, setLikeLoadingIds] = useState<Set<number>>(new Set());
  const { user: currentUser } = useAuth();
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [threadData, answersData] = await Promise.all([
        fetchThreadDetail(threadId),
        fetchAnswers(threadId),
      ]);

      setThread(threadData);
      setAnswers(answersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
      toast({
        variant: 'destructive',
        title: '読み込みに失敗しました',
        description: '時間をおいて再度お試しください。',
      });
    } finally {
      setLoading(false);
    }
  }, [threadId, toast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated, loadData]);

  const handleSubmitAnswer = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!answerContent.trim()) {
      setError('回答内容を入力してください');
      return;
    }

    try {
      await createAnswer(threadId, answerContent);
      setAnswerContent('');
      toast({
        description: '回答を投稿しました',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答の投稿に失敗しました');
      toast({
        variant: 'destructive',
        title: '回答の投稿に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleSelectBestAnswer = async (answerId: number) => {
    if (!confirm('この回答をベストアンサーに選びますか？')) {
      return;
    }

    try {
      const result = await selectBestAnswer(answerId);
      toast({
        description: result?.reward
          ? `ベストアンサーを選択しました（${result.reward} コイン付与）`
          : 'ベストアンサーを選択しました',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ベストアンサーの選択に失敗しました');
      toast({
        variant: 'destructive',
        title: 'ベストアンサーの選択に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleDeleteAnswer = async (answerId: number) => {
    if (!confirm('この回答を削除しますか？')) {
      return;
    }

    try {
      await deleteAnswer(answerId);
      toast({ description: '回答を削除しました' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答の削除に失敗しました');
      toast({
        variant: 'destructive',
        title: '回答の削除に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleToggleLike = async (answer: Answer) => {
    if (!isAuthenticated) {
      setError('いいねするにはログインが必要です');
      return;
    }

    setLikeLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(answer.id);
      return next;
    });

    try {
      const result = answer.is_liked_by_me
        ? await unlikeAnswer(answer.id)
        : await likeAnswer(answer.id);

      setAnswers((prev) =>
        prev.map((a) =>
          a.id === answer.id
            ? { ...a, likes_count: result.likes_count, is_liked_by_me: result.is_liked_by_me }
            : a
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'いいねの更新に失敗しました');
      toast({
        variant: 'destructive',
        title: 'いいねの更新に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    }
    setLikeLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(answer.id);
      return next;
    });
  };

  const handleResolveThread = async () => {
    if (stake > 0 && !thread?.coin_reward_paid) {
      toast({
        variant: 'destructive',
        title: 'ベストアンサーを選択してください',
        description: 'コインが賭けられているため、ベストアンサーを選んで報酬を配分してください。',
      });
      return;
    }

    if (!confirm('このスレッドを解決済みにしますか？')) {
      return;
    }

    try {
      await updateThread(threadId, { status: 'resolved' });
      toast({ description: 'スレッドを解決済みにしました' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スレッドの更新に失敗しました');
      toast({
        variant: 'destructive',
        title: 'スレッドの更新に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
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

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <LoadingIndicator />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!thread) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>スレッドが見つかりませんでした</AlertTitle>
          <AlertDescription>URLをご確認ください。</AlertDescription>
        </Alert>
      </main>
    );
  }

  const isAuthor = currentUser?.id === thread.user_id;
  const canAnswer =
    isAuthenticated &&
    thread.status === 'open' &&
    (!thread.deadline || new Date(thread.deadline) > new Date());
  const deadlinePassed = thread.deadline && new Date(thread.deadline) <= new Date();
  const stake = Number(thread.coin_stake ?? 0);
  const fee = Number(thread.coin_fee ?? 0);
  const reward = Number.isNaN(Number(thread.coin_reward_amount))
    ? Math.max(stake - fee, 0)
    : Number(thread.coin_reward_amount ?? 0);

  const userInitial = (thread.user?.display_name || thread.user?.email || '?')
    .slice(0, 1)
    .toUpperCase();

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm">
        <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={thread.status === 'resolved' ? 'secondary' : 'default'}>
                  {thread.status === 'resolved' ? '解決済み' : '未解決'}
                </Badge>
                {thread.subject_tag && <Badge variant="outline">{thread.subject_tag.name}</Badge>}
                {thread.deadline && (
                  <Badge variant="destructive">締切 {formatDate(thread.deadline)}</Badge>
                )}
              {stake > 0 && <Badge variant="outline">報酬 {reward} 枚</Badge>}
            </div>
            <CardTitle className="text-3xl leading-tight">{thread.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <span>{thread.user?.display_name || thread.user?.email}</span>
              </div>
              <span>投稿: {formatDate(thread.created_at)}</span>
            </div>
          </div>
          {isAuthor && thread.status !== 'resolved' && (
            <Button variant="outline" onClick={handleResolveThread} className="w-full sm:w-auto">
              解決済みにする
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-lg leading-relaxed">{thread.content}</p>
        </CardContent>
      </Card>

      {canAnswer ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">回答を投稿</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <Textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="回答を入力してください"
                required
                rows={5}
              />
              <div className="flex justify-end">
                <Button type="submit">回答する</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              {thread.status === 'resolved' && 'このスレッドは解決済みです'}
              {deadlinePassed && thread.status === 'open' && '回答の受付は締め切られました'}
              {!isAuthenticated && (
                <span>
                  回答するには
                  <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                    ログイン
                  </Link>
                  してください
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">回答</CardTitle>
            <p className="text-sm text-muted-foreground">{answers.length} 件</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {answers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 px-4 py-10 text-center text-muted-foreground">
              まだ回答がありません
            </div>
          ) : (
            answers.map((answer) => {
              const isOwner = currentUser && currentUser.id === answer.user_id;
              const answerInitial = (answer.user?.display_name || answer.user?.email || '?')
                .slice(0, 1)
                .toUpperCase();
              return (
                <div
                  key={answer.id}
                  className={`rounded-lg border bg-card px-4 py-5 ${
                    answer.is_best_answer ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{answerInitial}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground">
                          {answer.user?.display_name || answer.user?.email}
                        </div>
                        <div>{formatDate(answer.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {answer.is_best_answer && <Badge>ベストアンサー</Badge>}
                      {!isAuthor && (
                        <Button
                          variant={answer.is_liked_by_me ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleLike(answer)}
                          disabled={likeLoadingIds.has(answer.id)}
                          className="gap-2 w-full sm:w-auto"
                        >
                          <span>👍</span>
                          {answer.likes_count || 0}
                        </Button>
                      )}
                      {isAuthor && !answer.is_best_answer && thread.status !== 'resolved' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSelectBestAnswer(answer.id)}
                          className="w-full sm:w-auto"
                        >
                          ベストに選ぶ
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAnswer(answer.id)}
                          className="w-full sm:w-auto text-destructive"
                        >
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed">
                    {answer.content}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </main>
  );
}
