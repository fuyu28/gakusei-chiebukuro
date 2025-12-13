'use client';

import { useCallback, useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { fetchPastExams, fetchSubjectTags, uploadPastExam, deletePastExam } from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import type { PastExamFile, SubjectTag } from '@/types';
import { useAuth, useRequireAuth } from '@/lib/auth-context';

export default function PastExamsPage() {
  const [files, setFiles] = useState<PastExamFile[]>([]);
  const [tags, setTags] = useState<SubjectTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const { user } = useAuth();
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
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
      const data = await fetchPastExams(selectedTag || undefined);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '過去問の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

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
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
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
    setSuccess('');

    if (!selectedTag) {
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
      setSuccess(`${selectedFiles.length}件の資料をアップロードしました`);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('この資料を削除しますか？')) return;

    setError('');
    setSuccess('');

    try {
      setDeletingId(fileId);
      await deletePastExam(fileId);
      setSuccess('資料を削除しました');
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-600 font-semibold">Archive</p>
          <h1 className="text-3xl font-bold">過去問アーカイブ</h1>
          <p className="text-gray-600 mt-1">PDF / JPEG / PNG を科目ごとにまとめて閲覧できます。</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">科目フィルター</label>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value, 10) : '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {success}
        </div>
      )}

      {isAuthenticated && (
        <div className="mb-8 rounded-xl border border-dashed border-blue-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">過去問をアップロード</h2>
              <p className="text-sm text-gray-600">PDF・JPEG・PNG を10MB以内でアップロードできます。</p>
            </div>
            {selectedFiles.length > 0 && (
              <div className="text-sm text-gray-700">
                {selectedFiles.length} 件選択中
              </div>
            )}
          </div>

          <form onSubmit={handleUpload} className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm font-medium">タイトル（任意・1件選択時のみ適用）</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 2023年度 前期 中間試験"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />

              <label className="block text-sm font-medium">科目</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value, 10) : '')}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">科目を選択</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">ファイル（複数選択可）</label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-300 px-4 py-3 hover:border-blue-400">
                <div>
                  <p className="font-medium">ファイルを選択</p>
                  <p className="text-sm text-gray-600">PDF, JPG, PNG / 最大10MB/件</p>
                  {selectedFiles.length > 0 && (
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedFiles.slice(0, 3).map((file) => `${file.name}（${formatFileSize(file.size)}）`).join(' / ')}
                      {selectedFiles.length > 3 ? ` ほか${selectedFiles.length - 3}件` : ''}
                    </p>
                  )}
                </div>
                <div className="rounded-md bg-blue-50 px-3 py-1 text-sm text-blue-700">選択</div>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {selectedFiles.length === 0 && (
                <p className="text-sm text-gray-500">まだファイルが選択されていません</p>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {uploading ? 'アップロード中...' : 'アップロード'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">過去問一覧</h2>
          <p className="text-sm text-gray-600">{files.length} 件</p>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-700">読み込み中です...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-700 shadow">
            {selectedTag ? 'この科目の過去問はまだありません' : 'アップロードされた過去問はまだありません'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {files.map((file) => (
              <div key={file.id} className="rounded-xl bg-white p-5 shadow hover:shadow-lg transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {file.subject_tag && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                          {file.subject_tag.name}
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        {fileTypeLabel(file.file_type)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold">{file.title}</h3>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(file.file_size)} ・ {formatDate(file.created_at)}
                    </p>
                    <p className="text-sm text-gray-600">
                      アップロード: {file.uploader?.display_name || file.uploader?.email || '不明'}
                    </p>
                    <div className="flex gap-3 pt-2">
                      {file.download_url && (
                        <a
                          href={file.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          閲覧 / ダウンロード
                        </a>
                      )}
                      <span className="self-center text-xs text-gray-500">有効期限1時間のリンク</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        className={`rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 ${
                          deletingId === file.id ? 'cursor-not-allowed opacity-60' : ''
                        }`}
                      >
                        {deletingId === file.id ? '削除中...' : '削除'}
                      </button>
                    )}

                    {file.file_type.startsWith('image/') && file.download_url && (
                      // Next.js の最適化ルールを避け、署名付きURLのプレビューのみ軽量表示
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.download_url}
                        alt={file.title}
                        className="hidden h-28 w-24 rounded-lg object-cover md:block"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
