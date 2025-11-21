'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAdminUsers, updateUserBanStatus } from '@/lib/api';
import type { AdminUser } from '@/types';
import { useAuth } from '@/lib/auth-context';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user?.is_admin) {
      router.push('/');
      return;
    }
    loadUsers();
  }, [loading, user, router, loadUsers]);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggleBan = async (targetUser: AdminUser) => {
    try {
      setUpdatingId(targetUser.id);
      setError('');
      setMessage('');
      const updated = await updateUserBanStatus(targetUser.id, !targetUser.is_banned);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      setMessage(updated.is_banned ? 'ユーザーをBANしました' : 'ユーザーのBANを解除しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setUpdatingId(null);
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
        <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
        <p className="text-gray-600 mt-2">ユーザーのBAN/解除などを管理できます</p>
      </div>

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

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">ユーザー名</th>
              <th className="px-4 py-3">メールアドレス</th>
              <th className="px-4 py-3">登録日</th>
              <th className="px-4 py-3 text-center">ステータス</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">
                  {u.display_name || '-'}
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  {new Date(u.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.is_banned ? (
                    <span className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                      BAN中
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                      有効
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleBan(u)}
                    disabled={updatingId === u.id}
                    className={`px-4 py-2 rounded-lg text-white text-sm transition ${
                      u.is_banned
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } ${updatingId === u.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updatingId === u.id
                      ? '更新中...'
                      : u.is_banned ? 'BAN解除' : 'BANする'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
