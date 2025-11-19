import { initAuthUI, setupLogoutButton } from './auth-module.js';
import { fetchSubjectTags, createThread } from './api.js';
import { showError, showSuccess, showLoading, hideLoading, navigateTo, requireAuth } from './utils.js';

// 認証チェック
requireAuth();

// 科目タグを読み込み
async function loadSubjectTags() {
  try {
    const tags = await fetchSubjectTags();
    const select = document.getElementById('subject-tag');

    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.id;  // APIは id を返す
      option.textContent = tag.name;
      select.appendChild(option);
    });
  } catch (error) {
    showError('科目タグの読み込みに失敗しました');
  }
}

// フォーム送信処理
async function handleThreadSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const subject_tag_id = parseInt(document.getElementById('subject-tag').value);
  const deadlineInput = document.getElementById('deadline').value;

  // バリデーション
  if (!title || !content || !subject_tag_id || isNaN(subject_tag_id)) {
    showError('すべての必須項目を入力してください');
    return;
  }

  // 締切をISO8601形式に変換
  let deadline = undefined;
  if (deadlineInput) {
    deadline = new Date(deadlineInput).toISOString();
  }

  try {
    showLoading();

    const thread = await createThread({
      title,
      content,
      subject_tag_id,
      deadline,
    });

    hideLoading();
    // スレッド詳細ページへ即座に遷移
    navigateTo(`thread.html?id=${thread.id}`);
  } catch (error) {
    hideLoading();
    showError(error.message || '投稿に失敗しました');
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  setupLogoutButton();
  loadSubjectTags();
  document.getElementById('thread-form').addEventListener('submit', handleThreadSubmit);
});
