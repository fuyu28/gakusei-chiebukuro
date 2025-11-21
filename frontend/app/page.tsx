'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchThreads, fetchSubjectTags } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Thread, SubjectTag } from '@/types';

export default function Home() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [tags, setTags] = useState<SubjectTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | ''>('');
  const [tagFilter, setTagFilter] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('created_at');

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
      const data = await fetchThreads({
        status: statusFilter || undefined,
        subject_tag_id: tagFilter || undefined,
        sort: sortBy,
        order: 'desc',
      });
      setThreads(data);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tagFilter, sortBy]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">質問一覧</h1>

        {/* フィルター */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">ステータス:</label>
            <select
              value={statusFilter}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべて</option>
              <option value="open">未解決</option>
              <option value="resolved">解決済み</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">科目:</label>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value ? parseInt(e.target.value) : '')}
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

          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">並び順:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">投稿日時</option>
              <option value="updated_at">更新日時</option>
            </select>
          </div>
        </div>

        {/* スレッド一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-lg">質問がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      href={`/threads/${thread.id}`}
                      className="text-xl font-semibold text-blue-600 hover:underline"
                    >
                      {thread.title}
                    </Link>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        thread.status === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {thread.status === 'resolved' ? '解決済み' : '未解決'}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-3">{thread.content}</p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {thread.subject_tag && (
                    <span className="px-3 py-1 bg-gray-100 rounded-full">
                      {thread.subject_tag.name}
                    </span>
                  )}
                  <span>{thread.user?.display_name || thread.user?.email}</span>
                  <span>{formatDate(thread.created_at)}</span>
                  {thread.deadline && (
                    <span className="text-red-600">
                      締切: {formatDate(thread.deadline)}
                    </span>
                  )}
                  <span>{thread.answers_count || 0}件の回答</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
