import { initAuthUI, setupLogoutButton } from './auth-module.js';
import { fetchThreadDetail, fetchAnswers, createAnswer, selectBestAnswer, deleteAnswer, getCurrentUser } from './api.js';
import { showError, showSuccess, showLoading, hideLoading, formatDate, escapeHtml, isLoggedIn } from './utils.js';

let currentThread = null;
let currentUser = null;

// URLからスレッドIDを取得
function getThreadIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? parseInt(id) : null;
}

// スレッド詳細を表示
async function loadThreadDetail() {
  const threadId = getThreadIdFromUrl();

  if (!threadId) {
    showError('スレッドIDが指定されていません');
    return;
  }

  try {
    showLoading();
    currentThread = await fetchThreadDetail(threadId);

    if (isLoggedIn()) {
      const response = await getCurrentUser();
      currentUser = response.user;
    }

    displayThread(currentThread);
    await loadAnswers(threadId);
    hideLoading();
  } catch (error) {
    hideLoading();
    showError(error.message || 'スレッドの読み込みに失敗しました');
  }
}

// スレッド詳細を表示
function displayThread(thread) {
  const container = document.getElementById('thread-detail');
  if (!container) return;

  const statusClass = thread.status === 'resolved' ? 'status-resolved' : 'status-open';
  const statusText = thread.status === 'resolved' ? '解決済み' : '未解決';
  const deadline = thread.deadline ? escapeHtml(formatDate(thread.deadline)) : '';
  const title = escapeHtml(thread.title);
  const content = escapeHtml(thread.content);
  const authorName = escapeHtml(thread.user?.display_name || thread.user?.email || '不明');
  const tagName = escapeHtml(thread.subject_tag?.name || '未分類');

  // ユーザーが作成者かチェック
  const isAuthor = currentUser && currentUser.id === thread.user_id;

  container.innerHTML = `
    <div class="thread-card">
      <div class="thread-header">
        <div>
          <h1 class="thread-title">${title}</h1>
          <span class="thread-status ${statusClass}">${statusText}</span>
        </div>
        ${isAuthor ? `
          <div class="thread-actions">
            <button id="resolve-button" class="btn-secondary" ${thread.status === 'resolved' ? 'disabled' : ''}>
              ${thread.status === 'resolved' ? '解決済み' : '解決済みにする'}
            </button>
          </div>
        ` : ''}
      </div>
      <div class="thread-content" style="white-space: pre-wrap; margin: 1.5rem 0;">${content}</div>
      <div class="thread-meta">
        <span class="thread-tag">${tagName}</span>
        <span class="thread-author">${authorName}</span>
        <span class="thread-date">${formatDate(thread.created_at)}</span>
        ${deadline ? `<span class="thread-deadline">締切: ${deadline}</span>` : ''}
      </div>
    </div>
  `;

  container.style.display = 'block';

  // 解決済みボタンのイベントリスナー
  if (isAuthor && thread.status !== 'resolved') {
    const resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      resolveButton.addEventListener('click', handleResolveThread);
    }
  }
}

// 回答一覧を読み込み
async function loadAnswers(threadId) {
  try {
    const answers = await fetchAnswers(threadId);
    displayAnswers(answers);
  } catch (error) {
    console.error('Failed to load answers:', error);
    showError('回答の読み込みに失敗しました');
  }
}

// 回答一覧を表示
function displayAnswers(answers) {
  const section = document.getElementById('answers-section');
  const list = document.getElementById('answers-list');
  const countElement = document.getElementById('answers-count');

  if (!section || !list || !countElement) return;

  countElement.textContent = answers.length;

  if (answers.length === 0) {
    list.innerHTML = '<p class="no-data">まだ回答がありません</p>';
  } else {
    list.innerHTML = answers.map(answer => {
      const content = escapeHtml(answer.content);
      const authorName = escapeHtml(answer.user?.display_name || answer.user?.email || '不明');
      const isBest = answer.is_best_answer;
      const isAuthor = currentUser && currentUser.id === answer.user_id;
      const isThreadAuthor = currentUser && currentThread && currentUser.id === currentThread.user_id;

      return `
        <div class="answer-card ${isBest ? 'best-answer' : ''}">
          ${isBest ? '<div class="best-answer-badge">ベストアンサー</div>' : ''}
          <div class="answer-content" style="white-space: pre-wrap;">${content}</div>
          <div class="answer-meta">
            <span class="answer-author">${authorName}</span>
            <span class="answer-date">${formatDate(answer.created_at)}</span>
            ${isThreadAuthor && !isBest && currentThread.status !== 'resolved' ? `
              <button class="btn-best-answer" data-answer-id="${answer.id}">ベストアンサーに選ぶ</button>
            ` : ''}
            ${isAuthor ? `
              <button class="btn-delete-answer" data-answer-id="${answer.id}">削除</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // ベストアンサーボタンのイベントリスナー
    document.querySelectorAll('.btn-best-answer').forEach(button => {
      button.addEventListener('click', (e) => {
        const answerId = parseInt(e.target.dataset.answerId);
        handleSelectBestAnswer(answerId);
      });
    });

    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.btn-delete-answer').forEach(button => {
      button.addEventListener('click', (e) => {
        const answerId = parseInt(e.target.dataset.answerId);
        handleDeleteAnswer(answerId);
      });
    });
  }

  section.style.display = 'block';
}

// 回答を投稿
async function handleAnswerSubmit(event) {
  event.preventDefault();

  const content = document.getElementById('answer-content').value;
  const threadId = getThreadIdFromUrl();

  if (!content || !threadId) {
    showError('回答内容を入力してください');
    return;
  }

  try {
    showLoading();
    await createAnswer(threadId, content);

    // フォームをクリア
    document.getElementById('answer-content').value = '';

    // 回答一覧を再読み込み
    await loadAnswers(threadId);

    hideLoading();
    showSuccess('回答を投稿しました');
  } catch (error) {
    hideLoading();
    showError(error.message || '回答の投稿に失敗しました');
  }
}

// ベストアンサーを選択
async function handleSelectBestAnswer(answerId) {
  if (!confirm('この回答をベストアンサーに選びますか？')) {
    return;
  }

  try {
    showLoading();
    await selectBestAnswer(answerId);

    // スレッドと回答を再読み込み
    await loadThreadDetail();

    hideLoading();
    showSuccess('ベストアンサーを選択しました');
  } catch (error) {
    hideLoading();
    showError(error.message || 'ベストアンサーの選択に失敗しました');
  }
}

// 回答を削除
async function handleDeleteAnswer(answerId) {
  if (!confirm('この回答を削除しますか？')) {
    return;
  }

  try {
    showLoading();
    await deleteAnswer(answerId);

    // 回答一覧を再読み込み
    const threadId = getThreadIdFromUrl();
    await loadAnswers(threadId);

    hideLoading();
    showSuccess('回答を削除しました');
  } catch (error) {
    hideLoading();
    showError(error.message || '回答の削除に失敗しました');
  }
}

// スレッドを解決済みにする
async function handleResolveThread() {
  if (!confirm('このスレッドを解決済みにしますか？')) {
    return;
  }

  try {
    showLoading();
    const { updateThread } = await import('./api.js');
    await updateThread(currentThread.id, { status: 'resolved' });

    // スレッド詳細を再読み込み
    await loadThreadDetail();

    hideLoading();
    showSuccess('スレッドを解決済みにしました');
  } catch (error) {
    hideLoading();
    showError(error.message || 'スレッドの更新に失敗しました');
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  setupLogoutButton();

  // 回答フォームのイベントリスナー
  const answerForm = document.getElementById('answer-form');
  if (answerForm) {
    answerForm.addEventListener('submit', handleAnswerSubmit);
  }

  // スレッド詳細を読み込み
  loadThreadDetail();
});
