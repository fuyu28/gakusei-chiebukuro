'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createThread, fetchSubjectTags } from '@/lib/api';
import type { SubjectTag } from '@/types';
import { useAuth } from '@/lib/auth-context';

export default function NewThreadPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectTagId, setSubjectTagId] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [tags, setTags] = useState<SubjectTag[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

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

      router.push(`/threads/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">質問を投稿</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              タイトル <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="質問のタイトルを入力してください"
              maxLength={200}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              質問内容 <span className="text-red-600">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="質問の詳細を入力してください"
              required
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="subjectTag" className="block text-sm font-medium mb-2">
              科目 <span className="text-red-600">*</span>
            </label>
            <select
              id="subjectTag"
              value={subjectTagId}
              onChange={(e) => setSubjectTagId(e.target.value ? parseInt(e.target.value) : '')}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">科目を選択してください</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium mb-2">
              回答締切（任意）
            </label>
            <input
              type="datetime-local"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              締切を設定すると、その日時以降は回答できなくなります
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '投稿中...' : '投稿する'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
