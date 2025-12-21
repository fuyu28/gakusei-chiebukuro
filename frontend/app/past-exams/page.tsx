'use client';

import { useCallback, useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { fetchPastExams, fetchSubjectTags, uploadPastExam, deletePastExam } from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { PastExamFile, SubjectTag } from '@/types';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingIndicator } from '@/components/ui/loading-indicator';


export default function PastExamsPage() {
  const [files, setFiles] = useState<PastExamFile[]>([]);
  const [tags, setTags] = useState<SubjectTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const { user } = useAuth();
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  const isAdmin = Boolean(user?.is_admin);

  const fileTypeLabel = (mime: string) => {
    if (!mime) return 'FILE';
    const [, subtype] = mime.split('/');
    return (subtype || mime).toUpperCase();
  };

  const loadTags = useCallback(async () => {
    try {
      const data = await fetchSubjectTags();
      setTags(data);
    } catch (err) {
      console.error('Failed to load subject tags', err);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchPastExams(selectedTag === 'all' ? undefined : Number(selectedTag));
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '参考資料の取得に失敗しました');
      toast({
        variant: 'destructive',
        title: '参考資料の取得に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTag, toast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadTags();
  }, [isAuthenticated, loadTags]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadFiles();
  }, [isAuthenticated, loadFiles]);

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setSelectedFiles(files);
    if (files.length === 1 && !title) {
      setTitle(files[0].name);
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (selectedTag === 'all') {
      setError('科目を選択してください');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('アップロードするファイルを選択してください');
      return;
    }

    const formData = new FormData();
    formData.append('subject_tag_id', selectedTag.toString());
    selectedFiles.forEach((file) => formData.append('file', file));
    if (selectedFiles.length === 1 && title.trim()) {
      formData.append('title', title.trim());
    }

    try {
      setUploading(true);
      await uploadPastExam(formData);
      setSelectedFiles([]);
      setTitle('');
      toast({
        description: `${selectedFiles.length}件の資料をアップロードしました`,
      });
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      toast({
        variant: 'destructive',
        title: 'アップロードに失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('この資料を削除しますか？')) return;

    setError('');

    try {
      setDeletingId(fileId);
      await deletePastExam(fileId);
      toast({ description: '資料を削除しました' });
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
      toast({
        variant: 'destructive',
        title: '削除に失敗しました',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingId(null);
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
      <PageHeader
        eyebrow="Archive"
        title="参考資料アーカイブ"
        description="PDF / JPEG / PNG を科目ごとにまとめて閲覧できます。"
        action={
          <div className="space-y-1 md:min-w-[12rem]">
            <Label className="text-xs text-muted-foreground">科目フィルター</Label>
            <Select value={selectedTag} onValueChange={(value) => setSelectedTag(value)}>
              <SelectTrigger className="w-full md:w-48">
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
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isAuthenticated && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-xl">参考資料をアップロード</CardTitle>
              <p className="text-sm text-muted-foreground">PDF・JPEG・PNG を10MB以内でアップロードできます。</p>
            </div>
            {selectedFiles.length > 0 && (
              <Badge variant="secondary">{selectedFiles.length} 件選択中</Badge>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>タイトル（任意・1件選択時のみ適用）</Label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例: 2023年度 前期 中間試験"
                  />
                </div>

                <div className="space-y-2">
                  <Label>科目</Label>
                  <Select value={selectedTag} onValueChange={(value) => setSelectedTag(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="科目を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">科目を選択</SelectItem>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={String(tag.id)}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>ファイル（複数選択可）</Label>
                  <Input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    multiple
                    onChange={handleFileChange}
                  />
                  {selectedFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">まだファイルが選択されていません</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedFiles.slice(0, 3).map((file) => `${file.name}（${formatFileSize(file.size)}）`).join(' / ')}
                      {selectedFiles.length > 3 ? ` ほか${selectedFiles.length - 3}件` : ''}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
                    {uploading ? 'アップロード中...' : 'アップロード'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">参考資料一覧</CardTitle>
          <p className="text-sm text-muted-foreground">{files.length} 件</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingIndicator label="読み込み中です..." className="py-6" />
          ) : files.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 px-4 py-10 text-center text-muted-foreground">
              {selectedTag === 'all' ? 'アップロードされた参考資料はまだありません' : 'この科目の参考資料はまだありません'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {files.map((file) => (
                <Card
                  key={file.id}
                  className="shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {file.subject_tag && <Badge variant="secondary">{file.subject_tag.name}</Badge>}
                      <Badge variant="outline">{fileTypeLabel(file.file_type)}</Badge>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{file.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.file_size)} ・ {formatDate(file.created_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        アップロード: {file.uploader?.display_name || file.uploader?.email || '不明'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        {file.download_url && (
                          <Button asChild size="sm" className="w-full sm:w-auto">
                            <a
                              href={file.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              閲覧 / ダウンロード
                            </a>
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">有効期限1時間のリンク</span>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive w-full sm:w-auto"
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                        >
                          {deletingId === file.id ? '削除中...' : '削除'}
                        </Button>
                      )}
                    </div>
                    {file.file_type.startsWith('image/') && file.download_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.download_url}
                        alt={file.title}
                        className="hidden h-32 w-full rounded-lg object-cover md:block"
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
