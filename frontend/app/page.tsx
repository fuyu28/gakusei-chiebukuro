'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchThreads, fetchSubjectTags } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Thread, SubjectTag } from '@/types';
import { useRequireAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [tags, setTags] = useState<SubjectTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [error, setError] = useState('');
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();

  const loadTags = useCallback(async () => {
    try {
      const data = await fetchSubjectTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchThreads({
        status: statusFilter === 'all' ? undefined : statusFilter,
        subject_tag_id: tagFilter === 'all' ? undefined : Number(tagFilter),
        sort: sortBy,
        order: 'desc',
      });
      setThreads(data);
    } catch (error) {
      console.error('Failed to load threads:', error);
      setError('スレッドの取得に失敗しました');
      toast({
        variant: 'destructive',
        title: '読み込みに失敗しました',
        description: '時間をおいて再度お試しください。',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tagFilter, sortBy, toast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadTags();
  }, [isAuthenticated, loadTags]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadThreads();
  }, [isAuthenticated, loadThreads]);

  if (authLoading) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">みんなの質問をチェック</p>
            <h1 className="text-3xl font-bold tracking-tight">質問一覧</h1>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/threads/new">質問を投稿する</Link>
          </Button>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">絞り込み</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as 'all' | 'open' | 'resolved')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="open">未解決</SelectItem>
                  <SelectItem value="resolved">解決済み</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>科目</Label>
              <Select value={tagFilter} onValueChange={(value) => setTagFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={String(tag.id)}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>並び順</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="投稿日時" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">投稿日時</SelectItem>
                  <SelectItem value="updated_at">更新日時</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      ) : threads.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            まだ質問がありません
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {threads.map((thread) => (
            <Card
              key={thread.id}
              className="shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={thread.status === 'resolved' ? 'secondary' : 'default'}>
                    {thread.status === 'resolved' ? '解決済み' : '未解決'}
                  </Badge>
                  {thread.subject_tag && (
                    <Badge variant="outline">{thread.subject_tag.name}</Badge>
                  )}
                  {thread.deadline && (
                    <Badge variant="destructive">締切 {formatDate(thread.deadline)}</Badge>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Link
                      href={`/threads/${thread.id}`}
                      className="text-xl font-semibold leading-tight hover:text-primary"
                    >
                      {thread.title}
                    </Link>
                    <p className="line-clamp-2 text-muted-foreground">{thread.content}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{thread.user?.display_name || thread.user?.email}</span>
                  <span>投稿: {formatDate(thread.created_at)}</span>
                  <Badge variant="outline">{thread.answers_count || 0}件の回答</Badge>
                </div>
                <div className="flex justify-end">
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href={`/threads/${thread.id}`}>詳細をみる</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
