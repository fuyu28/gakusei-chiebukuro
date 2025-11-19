/**
 * 認証関連の処理 - ES Modules版
 */

import { isLoggedIn, getCurrentUser, clearAuthToken, login as apiLogin, logout as apiLogout, signup as apiSignup } from './api.js';
import { showError, showSuccess, showLoading, hideLoading, navigateTo, isValidEmail, isMeijoEmail } from './utils.js';

/**
 * ページ読み込み時にヘッダーのログイン状態を更新
 */
async function updateAuthUI() {
  const loggedInElements = document.querySelectorAll('.logged-in');
  const loggedOutElements = document.querySelectorAll('.logged-out');

  if (isLoggedIn()) {
    // ログイン中
    loggedInElements.forEach(el => el.style.display = 'block');
    loggedOutElements.forEach(el => el.style.display = 'none');

    // ユーザー情報を表示
    await displayCurrentUser();
  } else {
    // ログアウト中
    loggedInElements.forEach(el => el.style.display = 'none');
    loggedOutElements.forEach(el => el.style.display = 'block');
  }
}

/**
 * 現在のユーザー情報を取得して表示
 */
async function displayCurrentUser() {
  try {
    const response = await getCurrentUser();
    const userInfoElement = document.getElementById('user-info');

    if (userInfoElement && response.user) {
      userInfoElement.textContent = response.user.display_name || response.user.email;
    }
  } catch (error) {
    console.error('Failed to get user info:', error);
    // トークンが無効な場合はクリア
    clearAuthToken();
    updateAuthUI();
  }
}

/**
 * ログインフォームの送信処理
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // バリデーション
  if (!isValidEmail(email)) {
    showError('有効なメールアドレスを入力してください');
    return;
  }

  try {
    showLoading();
    await apiLogin(email, password);

    hideLoading();
    // トップページへ即座に遷移
    navigateTo('/index.html');
  } catch (error) {
    hideLoading();
    showError(error.message || 'ログインに失敗しました');
  }
}

/**
 * サインアップフォームの送信処理
 */
async function handleSignup(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;
  const displayName = document.getElementById('display-name').value;

  // バリデーション
  if (!isValidEmail(email)) {
    showError('有効なメールアドレスを入力してください');
    return;
  }

  if (!isMeijoEmail(email)) {
    showError('名城大学のメールアドレス(@ccmailg.meijo-u.ac.jp)を使用してください');
    return;
  }

  if (password.length < 8) {
    showError('パスワードは8文字以上で入力してください');
    return;
  }

  if (password !== passwordConfirm) {
    showError('パスワードが一致しません');
    return;
  }

  try {
    showLoading();
    await apiSignup(email, password, displayName);

    hideLoading();
    // ログインページへ即座に遷移
    navigateTo('/login.html');
  } catch (error) {
    hideLoading();
    showError(error.message || 'アカウント作成に失敗しました');
  }
}

/**
 * ログアウト処理
 */
async function handleLogout() {
  try {
    await apiLogout();
    // ログインページへ即座に遷移
    navigateTo('/login.html');
  } catch (error) {
    showError(error.message || 'ログアウトに失敗しました');
  }
}

/**
 * 認証UIを初期化（各ページで呼び出す）
 */
export function initAuthUI() {
  updateAuthUI();
}

/**
 * ログアウトボタンのイベントリスナー設定
 */
export function setupLogoutButton() {
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
}

/**
 * ログインフォームの初期化
 */
export function initLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

/**
 * サインアップフォームの初期化
 */
export function initSignupForm() {
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
}
