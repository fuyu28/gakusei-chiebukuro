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
import { useAuth } from '@/lib/auth-context';
import { SuccessToast } from '@/components/SuccessToast';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = Number(params.id);

  const [thread, setThread] = useState<Thread | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerContent, setAnswerContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [likeLoadingIds, setLikeLoadingIds] = useState<Set<number>>(new Set());
  const { user: currentUser, isAuthenticated } = useAuth();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [threadData, answersData] = await Promise.all([
        fetchThreadDetail(threadId),
        fetchAnswers(threadId),
      ]);

      setThread(threadData);
      setAnswers(answersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitAnswer = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!answerContent.trim()) {
      setError('回答内容を入力してください');
      return;
    }

    try {
      await createAnswer(threadId, answerContent);
      setAnswerContent('');
      setSuccess('回答を投稿しました');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答の投稿に失敗しました');
    }
  };

  const handleSelectBestAnswer = async (answerId: number) => {
    if (!confirm('この回答をベストアンサーに選びますか？')) {
      return;
    }

    try {
      await selectBestAnswer(answerId);
      setSuccess('ベストアンサーを選択しました');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ベストアンサーの選択に失敗しました');
    }
  };

  const handleDeleteAnswer = async (answerId: number) => {
    if (!confirm('この回答を削除しますか？')) {
      return;
    }

    try {
      await deleteAnswer(answerId);
      setSuccess('回答を削除しました');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答の削除に失敗しました');
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
    }
    setLikeLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(answer.id);
      return next;
    });
  };

  const handleResolveThread = async () => {
    if (!confirm('このスレッドを解決済みにしますか？')) {
      return;
    }

    try {
      await updateThread(threadId, { status: 'resolved' });
      setSuccess('スレッドを解決済みにしました');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スレッドの更新に失敗しました');
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!thread) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">スレッドが見つかりませんでした</p>
        </div>
      </main>
    );
  }

  const isAuthor = currentUser?.id === thread.user_id;
  const canAnswer =
    isAuthenticated &&
    thread.status === 'open' &&
    (!thread.deadline || new Date(thread.deadline) > new Date());

  return (
    <>
      <SuccessToast message={success} onClose={() => setSuccess('')} />
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
        )}

        {/* スレッド詳細 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h1 className="text-3xl font-bold">{thread.title}</h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${thread.status === 'resolved'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                    }`}
                >
                  {thread.status === 'resolved' ? '解決済み' : '未解決'}
                </span>
              </div>
            </div>
            {isAuthor && thread.status !== 'resolved' && (
              <button
                onClick={handleResolveThread}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                解決済みにする
              </button>
            )}
          </div>

          <p className="text-lg mb-6 whitespace-pre-wrap">{thread.content}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {thread.subject_tag && (
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {thread.subject_tag.name}
              </span>
            )}
            <span>{thread.user?.display_name || thread.user?.email}</span>
            <span>{formatDate(thread.created_at)}</span>
            {thread.deadline && (
              <span className="text-red-600">締切: {formatDate(thread.deadline)}</span>
            )}
          </div>
        </div>

        {/* 回答セクション */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            回答 ({answers.length}件)
          </h2>

          {answers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
              まだ回答がありません
            </div>
          ) : (
            <div className="space-y-4">
              {answers.map((answer) => (
                <div
                  key={answer.id}
                  className={`bg-white rounded-lg shadow-md p-6 ${answer.is_best_answer ? 'border-2 border-green-500' : ''
                    }`}
                >
                  {answer.is_best_answer && (
                    <div className="inline-block px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full mb-3">
                      ベストアンサー
                    </div>
                  )}

                  <p className="text-lg mb-4 whitespace-pre-wrap">{answer.content}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span className="font-medium">
                        {answer.user?.display_name || answer.user?.email}
                      </span>
                      <span>{formatDate(answer.created_at)}</span>
                    </div>

                    <div className="flex gap-2 items-center">
                      {/* Like Button */}
                      {!isAuthor && (
                        <button
                          onClick={() => handleToggleLike(answer)}
                          disabled={!isAuthenticated || likeLoadingIds.has(answer.id)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full border transition ${answer.is_liked_by_me
                            ? 'bg-pink-50 border-pink-200 text-pink-600'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            } ${!isAuthenticated || likeLoadingIds.has(answer.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill={answer.is_liked_by_me ? 'currentColor' : 'none'}
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                            />
                          </svg>
                          <span className="text-sm font-medium">{answer.likes_count || 0}</span>
                        </button>
                      )}

                      {isAuthor &&
                        !answer.is_best_answer &&
                        thread.status !== 'resolved' && (
                          <button
                            onClick={() => handleSelectBestAnswer(answer.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                          >
                            ベストアンサーに選ぶ
                          </button>
                        )}
                      {currentUser && currentUser.id === answer.user_id && (
                        <button
                          onClick={() => handleDeleteAnswer(answer.id)}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 回答フォーム */}
        {canAnswer ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-bold mb-4">回答を投稿</h3>
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="回答を入力してください"
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                回答する
              </button>
            </form>
          </div>
        ) : (
          !isAuthenticated && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">
                回答するには
                <Link href="/login" className="text-blue-600 hover:underline mx-1">
                  ログイン
                </Link>
                してください
              </p>
            </div>
          )
        )}
      </main>
    </>
  );
}
