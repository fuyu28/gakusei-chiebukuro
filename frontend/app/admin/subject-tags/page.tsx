'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import AdminNav from '@/components/AdminNav';
import { createSubjectTag, fetchSubjectTags, updateSubjectTag, deleteSubjectTag } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { SubjectTag } from '@/types';

export default function AdminSubjectTagsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tags, setTags] = useState<SubjectTag[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadTags = useCallback(async () => {
    try {
      setError('');
      const data = await fetchSubjectTags();
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      setTags(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : '科目一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user?.is_admin) {
      router.push('/');
      return;
    }

    loadTags();
  }, [loading, user, router, loadTags]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('科目名を入力してください');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const tag = await createSubjectTag(name.trim());
      setTags((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
      );
      setName('');
      setMessage('科目を追加しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '科目の追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (tag: SubjectTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setMessage('');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!editName.trim()) {
      setError('科目名を入力してください');
      return;
    }

    try {
      setUpdatingId(editingId);
      setError('');
      setMessage('');

      const updated = await updateSubjectTag(editingId, editName.trim());
      setTags((prev) =>
        prev
          .map((tag) => (tag.id === editingId ? updated : tag))
          .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
      );
      setMessage('科目名を更新しました');
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : '科目の更新に失敗しました');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (tag: SubjectTag) => {
    const confirmed = window.confirm(`「${tag.name}」を削除しますか？`);
    if (!confirmed) return;

    try {
      setDeletingId(tag.id);
      setError('');
      setMessage('');

      await deleteSubjectTag(tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      setMessage('科目を削除しました');
      if (editingId === tag.id) {
        handleCancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '科目の削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!user?.is_admin) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">権限がありません</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">科目管理</h1>
        <p className="text-gray-600 mt-2">科目タグの追加や一覧確認を行えます</p>
      </div>

      <AdminNav />

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              追加する科目名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="例: 数学、英語、物理"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">100文字以内で入力してください</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? '追加中...' : '科目を追加'}
          </button>
        </form>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">登録済みの科目</h2>
            <span className="text-sm text-gray-500">{tags.length}件</span>
          </div>

          {tags.length === 0 ? (
            <p className="text-gray-500">まだ科目が登録されていません</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tags.map((tag) => {
                const isEditing = editingId === tag.id;
                const isUpdating = updatingId === tag.id;
                const isDeleting = deletingId === tag.id;

                return (
                  <li key={tag.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{tag.name}</span>
                      )}
                      <div className="text-xs text-gray-500 mt-1">ID: {tag.id}</div>
                    </div>

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {isUpdating ? '保存中...' : '保存'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(tag)}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tag)}
                            disabled={isDeleting}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? '削除中...' : '削除'}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
