/**
 * 認証関連の処理 - 経験者が実装
 * ログイン状態の管理とUIの制御
 */

// ========== ログイン状態管理 ==========

/**
 * ページ読み込み時にヘッダーのログイン状態を更新
 */
function updateAuthUI() {
  const loggedInElements = document.querySelectorAll('.logged-in');
  const loggedOutElements = document.querySelectorAll('.logged-out');

  if (isLoggedIn()) {
    // ログイン中
    loggedInElements.forEach(el => el.style.display = 'block');
    loggedOutElements.forEach(el => el.style.display = 'none');

    // ユーザー情報を表示
    displayCurrentUser();
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

// ========== ログインフォーム処理 ==========

/**
 * ログインフォームの送信処理
 * @param {Event} event - フォームイベント
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorContainer = document.getElementById('error-message');

  // バリデーション
  if (!isValidEmail(email)) {
    showError('有効なメールアドレスを入力してください');
    return;
  }

  try {
    showLoading();
    const response = await login(email, password);

    hideLoading();
    showSuccess('ログインしました');

    // トップページへ遷移
    setTimeout(() => {
      navigateTo('/index.html');
    }, 1000);
  } catch (error) {
    hideLoading();
    showError(error.message || 'ログインに失敗しました');
  }
}

// ========== サインアップフォーム処理 ==========

/**
 * サインアップフォームの送信処理
 * @param {Event} event - フォームイベント
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
    showError('名城大学のメールアドレス（@ccmailg.meijo-u.ac.jp）を使用してください');
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
    await signup(email, password, displayName);

    hideLoading();
    showSuccess('アカウントを作成しました。ログインしてください。');

    // ログインページへ遷移
    setTimeout(() => {
      navigateTo('/login.html');
    }, 2000);
  } catch (error) {
    hideLoading();
    showError(error.message || 'アカウント作成に失敗しました');
  }
}

// ========== ログアウト処理 ==========

/**
 * ログアウト処理
 */
async function handleLogout() {
  try {
    await logout();
    showSuccess('ログアウトしました');

    setTimeout(() => {
      navigateTo('/login.html');
    }, 1000);
  } catch (error) {
    showError(error.message || 'ログアウトに失敗しました');
  }
}

// ========== ページ読み込み時の初期化 ==========

document.addEventListener('DOMContentLoaded', () => {
  // ログイン状態に応じてUIを更新
  updateAuthUI();

  // ログアウトボタンのイベントリスナー
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
});
