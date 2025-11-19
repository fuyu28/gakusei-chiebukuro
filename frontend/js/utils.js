/**
 * ユーティリティ関数 - 経験者が実装
 * DOM操作や日付フォーマットなどのヘルパー関数
 */

// ========== DOM操作ヘルパー ==========

/**
 * 要素を表示
 * @param {string|HTMLElement} element - セレクタまたは要素
 */
function showElement(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) el.style.display = 'block';
}

/**
 * 要素を非表示
 * @param {string|HTMLElement} element - セレクタまたは要素
 */
function hideElement(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) el.style.display = 'none';
}

/**
 * 要素のクラスを追加
 * @param {string|HTMLElement} element - セレクタまたは要素
 * @param {string} className - クラス名
 */
function addClass(element, className) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) el.classList.add(className);
}

/**
 * 要素のクラスを削除
 * @param {string|HTMLElement} element - セレクタまたは要素
 * @param {string} className - クラス名
 */
function removeClass(element, className) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) el.classList.remove(className);
}

// ========== エラー表示 ==========

/**
 * エラーメッセージを表示
 * @param {string} message - エラーメッセージ
 * @param {string} containerId - 表示先のコンテナID
 */
function showError(message, containerId = 'error-message') {
  const container = document.getElementById(containerId);
  if (container) {
    container.textContent = message;
    container.style.display = 'block';
    setTimeout(() => {
      container.style.display = 'none';
    }, 5000);
  }
}

/**
 * 成功メッセージを表示
 * @param {string} message - 成功メッセージ
 * @param {string} containerId - 表示先のコンテナID
 */
function showSuccess(message, containerId = 'success-message') {
  const container = document.getElementById(containerId);
  if (container) {
    container.textContent = message;
    container.style.display = 'block';
    setTimeout(() => {
      container.style.display = 'none';
    }, 3000);
  }
}

// ========== 日付フォーマット ==========

/**
 * ISO8601形式の日付を読みやすい形式に変換
 * @param {string} isoDate - ISO8601形式の日付
 * @returns {string} フォーマットされた日付
 */
function formatDate(isoDate) {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 相対時間を表示（例：2時間前）
 * @param {string} isoDate - ISO8601形式の日付
 * @returns {string} 相対時間
 */
function timeAgo(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return formatDate(isoDate);
}

// ========== バリデーション ==========

/**
 * メールアドレスをバリデーション
 * @param {string} email - メールアドレス
 * @returns {boolean}
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 名城大学のメールアドレスかチェック
 * @param {string} email - メールアドレス
 * @returns {boolean}
 */
function isMeijoEmail(email) {
  return email.endsWith('@ccmailg.meijo-u.ac.jp');
}

// ========== テキスト処理 ==========

/**
 * テキストをエスケープしてXSSを防ぐ
 * @param {string} text - エスケープするテキスト
 * @returns {string} エスケープされたテキスト
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 改行をbrタグに変換
 * @param {string} text - 変換するテキスト
 * @returns {string}
 */
function nl2br(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// ========== ローディング表示 ==========

/**
 * ローディングを表示
 * @param {string} containerId - ローディング表示先のID
 */
function showLoading(containerId = 'loading') {
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = 'flex';
  }
}

/**
 * ローディングを非表示
 * @param {string} containerId - ローディング表示先のID
 */
function hideLoading(containerId = 'loading') {
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * 非同期関数をローディング表示でラップ
 * エラーが発生してもローディングを確実に非表示にする
 * @param {Function} fn - 実行する非同期関数
 * @param {string} containerId - ローディング表示先のID
 * @returns {Promise} 関数の実行結果
 */
async function withLoading(fn, containerId = 'loading') {
  try {
    showLoading(containerId);
    return await fn();
  } finally {
    hideLoading(containerId);
  }
}

// ========== ページ遷移 ==========

/**
 * ページ遷移
 * @param {string} url - 遷移先URL
 */
function navigateTo(url) {
  window.location.href = url;
}

/**
 * 認証が必要なページの場合、未ログインならログインページへ
 */
function requireAuth() {
  if (!isLoggedIn()) {
    navigateTo('/login.html');
  }
}
