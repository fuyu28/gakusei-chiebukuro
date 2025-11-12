# セットアップガイド

学生知恵袋を動かすための詳細なセットアップ手順です。

## 目次

1. [Supabaseのセットアップ](#1-supabaseのセットアップ)
2. [バックエンドのセットアップ](#2-バックエンドのセットアップ)
3. [フロントエンドのセットアップ](#3-フロントエンドのセットアップ)
4. [動作確認](#4-動作確認)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. Supabaseのセットアップ

### 1.1 プロジェクトの作成

1. [https://supabase.com](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ/ログイン
4. 「New Project」をクリック
5. 以下を入力:
   - **Name**: `gakusei-chiebukuro`
   - **Database Password**: 強力なパスワードを生成（メモしておく）
   - **Region**: `Northeast Asia (Tokyo)`
   - **Pricing Plan**: `Free`
6. 「Create new project」をクリック（数分かかります）

### 1.2 データベーススキーマの作成

1. 左サイドバーから「SQL Editor」を選択
2. 「New query」をクリック
3. プロジェクトの `backend/database/schema.sql` の内容をコピー＆ペースト
4. 「Run」をクリックしてスキーマを作成

### 1.3 認証設定

#### Email Authの有効化

1. 左サイドバーから「Authentication」→「Providers」を選択
2. 「Email」が有効になっていることを確認
3. 「Enable Email Confirmations」のチェックを**外す**（開発環境用）

#### メールドメイン制限（オプション）

Supabase側でドメイン制限を設定する場合:

1. 「Authentication」→「URL Configuration」を選択
2. 「Redirect URLs」に以下を追加:
   ```
   http://localhost:8080/*
   http://127.0.0.1:8080/*
   ```

**注意**: メールドメイン制限はバックエンドコードで実装済みです（`@ccmailg.meijo-u.ac.jp`のみ許可）

### 1.4 APIキーの取得

1. 左サイドバーから「Project Settings」→「API」を選択
2. 以下の値をメモ:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbG...`（長い文字列）
   - **service_role**: `eyJhbG...`（長い文字列）

⚠️ **重要**: `service_role` キーは絶対に公開しないでください！

---

## 2. バックエンドのセットアップ

### 2.1 Node.jsのインストール確認

```bash
node --version  # v20以上が必要
npm --version
```

インストールされていない場合は [https://nodejs.org](https://nodejs.org) からダウンロード

### 2.2 依存関係のインストール

```bash
cd backend
npm install
```

以下のパッケージがインストールされます:
- `hono`: Webフレームワーク
- `@supabase/supabase-js`: Supabaseクライアント
- `zod`: バリデーション
- `tsx`: TypeScript実行環境
- `typescript`: TypeScriptコンパイラ

### 2.3 環境変数の設定

```bash
# .env.example をコピー
cp .env.example .env
```

`.env` ファイルを編集:

```env
# Supabaseで取得した値を設定
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...（anon public キー）
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...（service_role キー）

# サーバー設定
PORT=3000
NODE_ENV=development

# メールドメイン制限
ALLOWED_EMAIL_DOMAIN=ccmailg.meijo-u.ac.jp
```

### 2.4 開発サーバーの起動

```bash
npm run dev
```

以下のメッセージが表示されればOK:

```
Server is running on http://localhost:3000
```

ブラウザで `http://localhost:3000` にアクセスして確認:

```json
{"message":"Gakusei Chiebukuro API","status":"healthy"}
```

---

## 3. フロントエンドのセットアップ

### 3.1 HTTPサーバーの起動

フロントエンドは静的ファイルなので、シンプルなHTTPサーバーで動作します。

**方法1: Python（推奨）**

```bash
cd frontend
python3 -m http.server 8080
```

**方法2: Node.js http-server**

```bash
cd frontend
npx http-server -p 8080
```

**方法3: VS Code Live Server**

VS Codeの拡張機能「Live Server」をインストールして、`index.html` を右クリック → 「Open with Live Server」

### 3.2 ブラウザでアクセス

`http://localhost:8080` にアクセス

---

## 4. 動作確認

### 4.1 アカウント作成

1. トップページで「アカウント作成」をクリック
2. 以下を入力:
   - **メールアドレス**: `test@ccmailg.meijo-u.ac.jp`
   - **表示名**: `テストユーザー`
   - **パスワード**: `testpass123`
3. 「アカウント作成」をクリック

⚠️ **注意**: 実際には存在しないメールアドレスでもOK（開発環境ではメール認証無効）

### 4.2 ログイン

1. ログインページで上記の認証情報を入力
2. 「ログイン」をクリック
3. トップページにリダイレクトされ、右上に表示名が表示される

### 4.3 質問投稿

1. 「質問する」ボタンをクリック
2. 以下を入力:
   - **タイトル**: `プログラミング基礎の課題について`
   - **質問内容**: `配列のソート方法がわかりません`
   - **科目**: `プログラミング基礎`
3. 「投稿する」をクリック
4. スレッド詳細ページに遷移

### 4.4 回答投稿

1. スレッド詳細ページの下部にある「回答を投稿」フォームに入力
2. 「回答する」をクリック
3. 回答が表示される

### 4.5 ベストアンサー選択

1. 質問を投稿したアカウントでログイン
2. スレッド詳細ページで回答の「ベストアンサーに選ぶ」ボタンをクリック
3. スレッドが「解決済み」になる

---

## 5. トラブルシューティング

### バックエンドが起動しない

**エラー: `Missing Supabase environment variables`**

→ `.env` ファイルが正しく設定されているか確認

**エラー: `EADDRINUSE: address already in use`**

→ ポート3000が既に使用中。別のポートを指定:

```bash
PORT=3001 npm run dev
```

### フロントエンドがAPIと通信できない

**エラー: `CORS policy: No 'Access-Control-Allow-Origin' header`**

→ バックエンドが起動しているか確認（`http://localhost:3000`）

### ログインできない

**エラー: `Invalid token`**

→ ブラウザのローカルストレージをクリア:

1. ブラウザの開発者ツールを開く（F12）
2. 「Application」→「Local Storage」→「http://localhost:8080」
3. `auth_token` を削除

### 大学メールアドレス以外で登録できてしまう

→ バックエンドの環境変数 `ALLOWED_EMAIL_DOMAIN` を確認

### データベースにデータが保存されない

→ Supabaseのログを確認:

1. Supabase Dashboard → 「Logs」→「Postgres Logs」
2. エラーメッセージを確認

**よくある原因:**
- RLS（Row Level Security）ポリシーの設定ミス
- スキーマが正しく実行されていない

---

## 次のステップ

1. **HTML/CSSのカスタマイズ**: 未経験者がデザインを改善
2. **機能追加**: いいね機能、検索機能など
3. **デプロイ**: 本番環境へのデプロイ

困ったことがあれば、経験者に相談してください！
