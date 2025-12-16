'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createThread, fetchSubjectTags } from '@/lib/api';
import type { SubjectTag } from '@/types';
import { useRequireAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

export default function NewThreadPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectTagId, setSubjectTagId] = useState<string | undefined>(undefined);
  const [deadline, setDeadline] = useState('');
  const [tags, setTags] = useState<SubjectTag[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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

  useEffect(() => {
    if (isAuthenticated) {
      loadTags();
    }
  }, [isAuthenticated, loadTags]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !content || !subjectTagId) {
      setError('すべての必須項目を入力してください');
      return;
    }

    try {
      setLoading(true);
      const deadlineISO = deadline ? new Date(deadline).toISOString() : undefined;

      const thread = await createThread({
        title,
        content,
        subject_tag_id: Number(subjectTagId),
        deadline: deadlineISO,
      });

      toast({ description: '質問を投稿しました' });
      router.push(`/threads/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
      toast({
        variant: 'destructive',
        title: '投稿に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">質問を投稿</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">
                タイトル <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="質問のタイトルを入力してください"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                質問内容 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="質問の詳細を入力してください"
                required
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectTag">
                科目 <span className="text-destructive">*</span>
              </Label>
              <Select value={subjectTagId} onValueChange={(value) => setSubjectTagId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="科目を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={String(tag.id)}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">回答締切（任意）</Label>
              <Input
                type="datetime-local"
                id="deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                締切を設定すると、その日時以降は回答できなくなります
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? '投稿中...' : '投稿する'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full sm:w-auto"
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
