'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            学生知恵袋
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/past-exams" className="text-gray-700 hover:text-gray-900">
              過去問
            </Link>
            {isAuthenticated ? (
              <>
                <span className="text-gray-700 flex items-center gap-2">
                  <span>{user?.display_name || user?.email}</span>
                  {user?.total_likes !== undefined && (
                    <span className="text-pink-600 text-sm flex items-center gap-1 bg-pink-50 px-2 py-0.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.16-1.1c-1.059-.958-2.55-2.045-3.933-3.293-2.722-2.453-3.486-4.289-3.486-5.757 0-1.39.857-2.398 2.002-2.689 1.174-.298 2.368.424 2.945 1.17.577-.746 1.771-1.468 2.945-1.17 1.145.291 2.002 1.299 2.002 2.689 0 1.468-.764 3.304-3.486 5.757-1.383 1.248-2.874 2.335-3.933 3.293l-.019.01-.005.003h-.002z" />
                      </svg>
                      {user.total_likes}
                    </span>
                  )}
                </span>
                {user?.is_admin && (
                  <Link
                    href="/admin/users"
                    className="text-gray-700 hover:text-gray-900"
                  >
                    管理
                  </Link>
                )}
                <Link
                  href="/threads/new"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  質問する
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-gray-900"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-gray-900">
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  アカウント作成
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
