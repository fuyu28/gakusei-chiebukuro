/**
 * API通信レイヤー - 経験者が実装
 * 未経験者はこのファイルの関数を呼び出すだけでAPIと通信できます
 */

const API_BASE_URL = 'http://localhost:3000/api';

// ローカルストレージからトークンを取得
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// トークンを保存
function setAuthToken(token) {
  localStorage.setItem('auth_token', token);
}

// トークンを削除
function clearAuthToken() {
  localStorage.removeItem('auth_token');
}

// 共通のfetch処理
async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return await response.json();
}

// ========== 認証API ==========

/**
 * サインアップ
 * @param {string} email - メールアドレス（@ccmailg.meijo-u.ac.jp）
 * @param {string} password - パスワード（8文字以上）
 * @param {string} displayName - 表示名（オプション）
 * @returns {Promise<Object>} ユーザー情報
 */
async function signup(email, password, displayName) {
  return await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      display_name: displayName,
    }),
  });
}

/**
 * ログイン
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @returns {Promise<Object>} アクセストークンとユーザー情報
 */
async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // トークンを保存
  if (data.access_token) {
    setAuthToken(data.access_token);
  }

  return data;
}

/**
 * ログアウト
 * @returns {Promise<Object>}
 */
async function logout() {
  const data = await apiFetch('/auth/logout', {
    method: 'POST',
  });

  // トークンを削除
  clearAuthToken();

  return data;
}

/**
 * 現在のユーザー情報を取得
 * @returns {Promise<Object>} ユーザー情報
 */
async function getCurrentUser() {
  return await apiFetch('/auth/me');
}

/**
 * ログイン状態をチェック
 * @returns {boolean}
 */
function isLoggedIn() {
  return !!getAuthToken();
}

// ========== スレッドAPI ==========

/**
 * スレッド一覧を取得
 * @param {Object} filters - フィルター条件
 * @param {string} filters.status - 'open' または 'resolved'
 * @param {number} filters.subject_tag_id - 科目タグID
 * @param {string} filters.sort - ソート項目（'created_at' または 'updated_at'）
 * @param {string} filters.order - ソート順（'asc' または 'desc'）
 * @returns {Promise<Array>} スレッドの配列
 */
async function fetchThreads(filters = {}) {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.subject_tag_id) params.append('subject_tag_id', filters.subject_tag_id);
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.order) params.append('order', filters.order);

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiFetch(`/threads${query}`);

  return data.threads;
}

/**
 * スレッド詳細を取得
 * @param {number} threadId - スレッドID
 * @returns {Promise<Object>} スレッド情報
 */
async function fetchThreadDetail(threadId) {
  const data = await apiFetch(`/threads/${threadId}`);
  return data.thread;
}

/**
 * スレッドを作成
 * @param {Object} threadData
 * @param {string} threadData.title - タイトル
 * @param {string} threadData.content - 本文
 * @param {number} threadData.subject_tag_id - 科目タグID
 * @param {string} threadData.deadline - 締切日時（ISO8601形式、オプション）
 * @returns {Promise<Object>} 作成されたスレッド
 */
async function createThread(threadData) {
  const data = await apiFetch('/threads', {
    method: 'POST',
    body: JSON.stringify(threadData),
  });

  return data.thread;
}

/**
 * スレッドを更新
 * @param {number} threadId - スレッドID
 * @param {Object} updates - 更新内容
 * @returns {Promise<Object>} 更新されたスレッド
 */
async function updateThread(threadId, updates) {
  const data = await apiFetch(`/threads/${threadId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  return data.thread;
}

/**
 * スレッドを削除
 * @param {number} threadId - スレッドID
 * @returns {Promise<Object>}
 */
async function deleteThread(threadId) {
  return await apiFetch(`/threads/${threadId}`, {
    method: 'DELETE',
  });
}

// ========== 回答API ==========

/**
 * スレッドの回答一覧を取得
 * @param {number} threadId - スレッドID
 * @returns {Promise<Array>} 回答の配列
 */
async function fetchAnswers(threadId) {
  const data = await apiFetch(`/answers/threads/${threadId}`);
  return data.answers;
}

/**
 * 回答を投稿
 * @param {number} threadId - スレッドID
 * @param {string} content - 回答内容
 * @returns {Promise<Object>} 投稿された回答
 */
async function createAnswer(threadId, content) {
  const data = await apiFetch('/answers', {
    method: 'POST',
    body: JSON.stringify({
      thread_id: threadId,
      content,
    }),
  });

  return data.answer;
}

/**
 * ベストアンサーを選択
 * @param {number} answerId - 回答ID
 * @returns {Promise<Object>}
 */
async function selectBestAnswer(answerId) {
  return await apiFetch(`/answers/${answerId}/best`, {
    method: 'PATCH',
  });
}

/**
 * 回答を削除
 * @param {number} answerId - 回答ID
 * @returns {Promise<Object>}
 */
async function deleteAnswer(answerId) {
  return await apiFetch(`/answers/${answerId}`, {
    method: 'DELETE',
  });
}

// ========== 科目タグAPI ==========

/**
 * 科目タグ一覧を取得
 * @returns {Promise<Array>} タグの配列
 */
async function fetchSubjectTags() {
  const data = await apiFetch('/subject-tags');
  return data.tags;
}

/**
 * 科目タグを作成（管理者用）
 * @param {string} name - タグ名
 * @returns {Promise<Object>}
 */
async function createSubjectTag(name) {
  const data = await apiFetch('/subject-tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  return data.tag;
}
