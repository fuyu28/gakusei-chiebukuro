'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchThreadDetail,
  fetchAnswers,
  createAnswer,
  selectBestAnswer,
  deleteAnswer,
  updateThread,
  updateAnswer,
  deleteThread,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Thread, Answer } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { SuccessToast } from '@/components/SuccessToast';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = Number(params.id);
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerContent, setAnswerContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [editThreadTitle, setEditThreadTitle] = useState('');
  const [editThreadContent, setEditThreadContent] = useState('');
  const [editThreadDeadline, setEditThreadDeadline] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
  const [editAnswerContent, setEditAnswerContent] = useState('');
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [deletingAnswerId, setDeletingAnswerId] = useState<number | null>(null);
  const { user: currentUser, isAuthenticated } = useAuth();
  const isAdmin = Boolean(currentUser?.is_admin);

  const formatDateTimeLocal = (value: string) => {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

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

  const startThreadEdit = () => {
    if (!thread) return;
    setError('');
    setSuccess('');
    setEditThreadTitle(thread.title);
    setEditThreadContent(thread.content);
    setEditThreadDeadline(thread.deadline ? formatDateTimeLocal(thread.deadline) : '');
    setIsEditingThread(true);
  };

  const handleUpdateThread = async (e: FormEvent) => {
    e.preventDefault();
    if (!thread) return;
    setError('');
    setSuccess('');

    if (!editThreadTitle.trim() || !editThreadContent.trim()) {
      setError('タイトルと内容は必須です');
      return;
    }

    try {
      const deadlineISO = editThreadDeadline
        ? new Date(editThreadDeadline).toISOString()
        : null;

      await updateThread(threadId, {
        title: editThreadTitle.trim(),
        content: editThreadContent.trim(),
        deadline: deadlineISO,
      });
      setIsEditingThread(false);
      setSuccess('質問を更新しました');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '質問の更新に失敗しました');
    }
  };

  const cancelThreadEdit = () => {
    setIsEditingThread(false);
  };

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

  const startEditAnswer = (answer: Answer) => {
    setError('');
    setSuccess('');
    setEditingAnswerId(answer.id);
    setEditAnswerContent(answer.content);
  };

  const handleUpdateAnswerContent = async (answerId: number) => {
    setError('');
    setSuccess('');

    if (!editAnswerContent.trim()) {
      setError('回答内容を入力してください');
      return;
    }

    try {
      await updateAnswer(answerId, editAnswerContent.trim());
      setSuccess('回答を更新しました');
      setEditingAnswerId(null);
      setEditAnswerContent('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答の更新に失敗しました');
    }
  };

  const cancelEditAnswer = () => {
    setEditingAnswerId(null);
    setEditAnswerContent('');
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
      setError('');
      setSuccess('');
      setDeletingAnswerId(answerId);
      await deleteAnswer(answerId);
      setSuccess('回答を削除しました');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答の削除に失敗しました');
    } finally {
      setDeletingAnswerId(null);
    }
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

  const handleDeleteThread = async () => {
    if (!confirm('このスレッドを削除しますか？')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setIsDeletingThread(true);
      await deleteThread(threadId);
      setSuccess('スレッドを削除しました');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スレッドの削除に失敗しました');
    } finally {
      setIsDeletingThread(false);
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
          {isEditingThread ? (
            <form onSubmit={handleUpdateThread} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={editThreadTitle}
                    onChange={(e) => setEditThreadTitle(e.target.value)}
                    maxLength={200}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="タイトルを入力"
                    required
                  />
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
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={cancelThreadEdit}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    キャンセル
                  </button>
                </div>
              </div>

              <textarea
                value={editThreadContent}
                onChange={(e) => setEditThreadContent(e.target.value)}
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 items-center">
                {thread.subject_tag && (
                  <span className="px-3 py-1 bg-gray-100 rounded-full">
                    {thread.subject_tag.name}
                  </span>
                )}
                <span>{thread.user?.display_name || thread.user?.email}</span>
                <span>{formatDate(thread.created_at)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">締切</span>
                  <input
                    type="datetime-local"
                    value={editThreadDeadline}
                    onChange={(e) => setEditThreadDeadline(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <h1 className="text-3xl font-bold">{thread.title}</h1>
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
                {(isAuthor || isAdmin) && (
                  <div className="flex gap-2">
                    {isAuthor && (
                      <>
                        {thread.status !== 'resolved' && (
                          <button
                            onClick={handleResolveThread}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            解決済みにする
                          </button>
                        )}
                        <button
                          onClick={startThreadEdit}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                          編集
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={handleDeleteThread}
                        disabled={isDeletingThread}
                        className={`px-4 py-2 rounded-lg text-white transition ${
                          isDeletingThread
                            ? 'bg-red-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {isDeletingThread ? '削除中...' : '削除'}
                      </button>
                    )}
                  </div>
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
            </>
          )}
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
              {answers.map((answer) => {
                const isAnswerOwner = currentUser?.id === answer.user_id;
                const canDeleteAnswer = isAdmin || isAnswerOwner;
                const canEditAnswer = isAnswerOwner && editingAnswerId !== answer.id;

                return (
                  <div
                    key={answer.id}
                    className={`bg-white rounded-lg shadow-md p-6 ${
                      answer.is_best_answer ? 'border-2 border-green-500' : ''
                    }`}
                  >
                    {answer.is_best_answer && (
                      <div className="inline-block px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full mb-3">
                        ベストアンサー
                      </div>
                    )}

                    {editingAnswerId === answer.id ? (
                      <div className="space-y-4 mb-2">
                        <textarea
                          value={editAnswerContent}
                          onChange={(e) => setEditAnswerContent(e.target.value)}
                          rows={5}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateAnswerContent(answer.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditAnswer}
                            className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-lg mb-4 whitespace-pre-wrap">{answer.content}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span className="font-medium">
                          {answer.user?.display_name || answer.user?.email}
                        </span>
                        <span>{formatDate(answer.created_at)}</span>
                      </div>

                      <div className="flex gap-2">
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
                        {canEditAnswer && (
                          <button
                            onClick={() => startEditAnswer(answer)}
                            className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition"
                          >
                            編集
                          </button>
                        )}
                        {canDeleteAnswer && (
                          <button
                            onClick={() => handleDeleteAnswer(answer.id)}
                            disabled={deletingAnswerId === answer.id || editingAnswerId === answer.id}
                            className={`px-4 py-2 text-sm rounded-lg text-white transition ${
                              deletingAnswerId === answer.id || editingAnswerId === answer.id
                                ? 'bg-red-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {deletingAnswerId === answer.id ? '削除中...' : '削除'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
