# 学生知恵袋

名城大学の学生向け、科目の質問ができるスレッド型Q&A掲示板システム

## 概要

Yahoo!知恵袋のような形式で、学生同士が学習に関する質問・回答を共有できるプラットフォームです。

### 主な機能

- **会員制**: 名城大学のメールアドレス（@ccmailg.meijo-u.ac.jp）のみ登録可能
- **質問投稿**: 科目タグ付きで質問を投稿
- **回答機能**: 質問に対して回答を投稿
- **ベストアンサー**: 質問者が最も役立った回答を選択
- **解決済/未解決**: ステータスで質問を管理
- **回答締切**: 質問に回答期限を設定可能
- **フィルタ機能**: ステータスや科目でフィルタリング

## 技術スタック

### バックエンド
- **言語**: TypeScript
- **フレームワーク**: Hono
- **認証**: Supabase Auth
- **データベース**: Supabase PostgreSQL
- **バリデーション**: Zod

### フロントエンド
- **フレームワーク**: Next.js 15（App Router）
- **UI**: React 19 + Tailwind CSS 3
- **言語**: TypeScript

## プロジェクト構造

```
gakusei-chiebukuro/
├── backend/              # バックエンドAPI
│   ├── src/
│   │   ├── index.ts      # エントリーポイント
│   │   ├── lib/          # ライブラリ（Supabase設定等）
│   │   ├── middleware/   # 認証ミドルウェア
│   │   ├── routes/       # APIルート
│   │   │   ├── auth.ts
│   │   │   ├── threads.ts
│   │   │   ├── answers.ts
│   │   │   └── subject-tags.ts
│   │   └── types/        # TypeScript型定義
│   ├── database/
│   │   └── schema.sql    # データベーススキーマ
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/             # Next.js フロントエンド
    ├── app/              # App Router ページ
    │   ├── layout.tsx    # ルートレイアウト
    │   ├── page.tsx      # トップページ（スレッド一覧）
    │   ├── login/        # ログインページ
    │   ├── signup/       # サインアップ
    │   └── threads/      # スレッド詳細・投稿
    ├── components/       # Header / Footer など共通UI
    ├── lib/              # APIクライアント・認証コンテキスト等
    ├── types/            # 型定義
    ├── tailwind.config.ts
    └── next.config.ts
```

## セットアップ

### 前提条件

- Node.js 20以上
- Supabaseアカウント

### 1. Supabaseプロジェクトのセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. データベースエディタで `backend/database/schema.sql` を実行
3. Authentication > Email Auth を有効化
4. Authentication > URL Configuration で以下を設定:
   - Site URL: `http://localhost:8080`
   - Redirect URLs: `http://localhost:8080/*`

### 2. バックエンドのセットアップ

```bash
cd backend

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集してSupabase認証情報を設定

# 開発サーバーの起動
npm run dev
```

**`.env` の設定例:**

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
NODE_ENV=development
ALLOWED_EMAIL_DOMAIN=ccmailg.meijo-u.ac.jp
```

### 3. フロントエンドのセットアップ

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動 (http://localhost:8080)
npm run dev
```

必要に応じて `.env.local` などで `NEXT_PUBLIC_API_BASE_URL` を上書きできます（デフォルトは `http://localhost:3000/api`）。

## Docker での起動（推奨）

Dockerを使うと、環境構築が簡単になります。

### クイックスタート

```bash
# 環境変数の設定
cd backend
cp .env.example .env
# .env ファイルを編集してSupabase認証情報を設定

# プロジェクトルートに戻る
cd ..

# Dockerコンテナを起動
docker-compose up -d --build
```

アクセス:
- フロントエンド: http://localhost:8080
- バックエンドAPI: http://localhost:3000

詳細な使用方法は [DOCKER.md](./DOCKER.md) を参照してください。

## API エンドポイント

### 認証

- `POST /api/auth/signup` - サインアップ
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報取得

### スレッド

- `GET /api/threads` - スレッド一覧取得
- `GET /api/threads/:id` - スレッド詳細取得
- `POST /api/threads` - スレッド作成（認証必要）
- `PATCH /api/threads/:id` - スレッド更新（認証必要）
- `DELETE /api/threads/:id` - スレッド削除（認証必要）

### 回答

- `GET /api/answers/threads/:thread_id` - 回答一覧取得
- `POST /api/answers` - 回答投稿（認証必要）
- `PATCH /api/answers/:id/best` - ベストアンサー選択（認証必要）
- `DELETE /api/answers/:id` - 回答削除（認証必要）

### 科目タグ

- `GET /api/subject-tags` - 科目タグ一覧取得
- `POST /api/subject-tags` - 科目タグ作成（管理用）


## テスト方法

1. アカウント作成（@ccmailg.meijo-u.ac.jp のメールアドレス）
2. ログイン
3. 質問を投稿
4. 回答を投稿
5. ベストアンサーを選択
6. フィルタ機能をテスト

## デプロイ

### バックエンド（Cloudflare Workers推奨）

```bash
cd backend
npm run build
# Cloudflare Workersにデプロイ
```

### フロントエンド（Netlify / Vercel / GitHub Pages等）

```bash
# frontend/ ディレクトリをそのままデプロイ
```

## ライセンス

MIT

