import { fetchThreads, fetchSubjectTags } from './api.js';
import { initAuthUI, setupLogoutButton } from './auth-module.js';
import { formatDate } from './utils.js';

// フィルター状態
const currentFilters = {
  status: undefined,
  subject_tag_id: undefined,
  sort: 'created_at',
  order: 'desc'
};

// スレッド一覧を読み込み
async function loadThreads() {
  try {
    const threads = await fetchThreads(currentFilters);
    displayThreads(threads);
  } catch (error) {
    console.error('Failed to load threads:', error);
  }
}

// スレッドを表示
function displayThreads(threads) {
  const container = document.getElementById('threads-container');
  if (!container) return;

  if (threads.length === 0) {
    container.innerHTML = '<p class="no-data">質問がありません</p>';
    return;
  }

  container.innerHTML = threads.map(thread => {
    const statusClass = thread.status === 'resolved' ? 'resolved' : 'open';
    const statusText = thread.status === 'resolved' ? '解決済み' : '未解決';
    const deadline = thread.deadline ? formatDate(thread.deadline) : '';

    return `
      <a href="thread.html?id=${thread.thread_id}" class="thread-item">
        <div class="thread-header">
          <div class="thread-title-row">
            <h3 class="thread-title">${thread.title}</h3>
            <span class="thread-status ${statusClass}">${statusText}</span>
          </div>
          <div class="thread-meta">
            <span class="thread-author">${thread.display_name || thread.email}</span>
            <span class="thread-date">${formatDate(thread.created_at)}</span>
            ${deadline ? `<span class="thread-deadline">締切: ${deadline}</span>` : ''}
          </div>
        </div>
        <p class="thread-content">${thread.content}</p>
        <div class="thread-footer">
          <span class="thread-tag">${thread.subject_tag_name}</span>
          <span class="thread-answers">${thread.answer_count || 0}件の回答</span>
        </div>
      </a>
    `;
  }).join('');
}

// 科目タグをロード
async function loadSubjectTags() {
  try {
    const tags = await fetchSubjectTags();
    const select = document.getElementById('subject-filter');
    if (!select) return;

    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.subject_tag_id;
      option.textContent = tag.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load subject tags:', error);
  }
}

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  setupLogoutButton();

  const statusFilter = document.getElementById('status-filter');
  const subjectFilter = document.getElementById('subject-filter');
  const sortFilter = document.getElementById('sort-filter');

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilters.status = e.target.value || undefined;
      loadThreads();
    });
  }

  if (subjectFilter) {
    subjectFilter.addEventListener('change', (e) => {
      currentFilters.subject_tag_id = e.target.value ? parseInt(e.target.value) : undefined;
      loadThreads();
    });
  }

  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      loadThreads();
    });
  }

  loadSubjectTags();
  loadThreads();
});
