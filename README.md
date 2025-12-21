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
- **回答へのいいね**: 役立つ回答にいいねをすることが可能（獲得したいいね数はプロフィールに表示）
- **参考資料アーカイブ**: PDF / 画像をアップロードし、科目ごとに共有・閲覧
- **フィルタ機能**: ステータスや科目でフィルタリング
- **管理者ダッシュボード**: 指定した管理者がユーザー一覧の確認やBAN/解除を実行可能

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

## CI / CD

- **CI (GitHub Actions)**: `.github/workflows/ci.yml` でPR時に実行。フロントエンドは Bun で lint/build、バックエンドは Bun で type-check/build を行い、Next.js キャッシュを活用して高速化。
- **CD (Cloudflare Workers - フロントエンド)**: OpenNext (`@opennextjs/cloudflare`) でビルドし、`wrangler` 経由で Workers へデプロイ。ビルド時に `NEXT_PUBLIC_API_BASE_URL` などの環境変数を設定する。
- **CD (Cloudflare Workers - バックエンド)**: `backend/wrangler.toml` を利用し `wrangler deploy` で Workers にデプロイ。Supabase キーなどのシークレット/環境変数は Cloudflare ダッシュボードまたは `wrangler secret put` / `[vars]` で設定する。

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
5. Storage でバケット `past-exams`（プライベート推奨）を作成
   
### 2. バックエンドのセットアップ

```bash
cd backend

# 依存関係のインストール（CIと同じくBunを推奨）
bun install   # または npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集してSupabase認証情報を設定

# 開発サーバーの起動
bun run dev   # または npm run dev
```

**`.env` の設定例:**

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PAST_EXAM_BUCKET=past-exams
PORT=3000
NODE_ENV=development
ALLOWED_EMAIL_DOMAIN=ccmailg.meijo-u.ac.jp
ADMIN_EMAILS=admin1@ccmailg.meijo-u.ac.jp,admin2@ccmailg.meijo-u.ac.jp
```

`ADMIN_EMAILS` には管理者権限を付与したいメールアドレスをカンマ区切りで指定します。指定されたユーザーは管理者ダッシュボードへアクセスでき、BAN 操作などを実行できます。
`SUPABASE_PAST_EXAM_BUCKET` は参考資料ファイルを保存する Supabase Storage バケット名です（デフォルト `past-exams`）。

### 3. フロントエンドのセットアップ

```bash
cd frontend

# 依存関係のインストール（CIと同じくBunを推奨）
bun install   # または npm install

# 開発サーバーの起動 (http://localhost:8080)
bun run dev   # または npm run dev
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

## 管理者機能

- 管理者に指定されたユーザーはフロントエンドから `/admin/users` にアクセスし、ユーザー一覧や BAN/解除操作を行えます。
- BAN されたユーザーは API へのアクセスが拒否され、質問・回答の投稿などができなくなります（ログインは可能ですが認証済み API が 403 を返します）。
- 管理者判定は環境変数 `ADMIN_EMAILS` のメールアドレス一覧で行います。

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
- `POST /api/answers/:id/like` - 回答へのいいね（認証必要）
- `DELETE /api/answers/:id/like` - 回答へのいいね解除（認証必要）

### 科目タグ

- `GET /api/subject-tags` - 科目タグ一覧取得
- `POST /api/subject-tags` - 科目タグ作成（管理用）

### 参考資料

- `GET /api/past-exams` - 参考資料一覧取得（`subject_tag_id` クエリで科目フィルタ）
- `POST /api/past-exams` - 参考資料をアップロード（要ログイン / `multipart/form-data` で `subject_tag_id`, `file`, `title` 任意）

### 管理者

- `GET /api/admin/users` - 管理者: ユーザー一覧取得
- `PATCH /api/admin/users/:id/ban` - 管理者: BAN/解除

## テスト方法

1. アカウント作成（@ccmailg.meijo-u.ac.jp のメールアドレス）
2. ログイン
3. 質問を投稿
4. 回答を投稿
5. ベストアンサーを選択
6. フィルタ機能をテスト

## デプロイ

### バックエンド（Cloudflare Workers）

```bash
cd backend
# ビルド
bun run build   # または npm run build
# デプロイ
wrangler deploy
```

`wrangler.toml` で Worker を管理。Supabaseキーなどの環境変数/シークレットは Cloudflare ダッシュボードまたは `wrangler secret put` / `[vars]` で設定してください。

### フロントエンド（Cloudflare Workers / OpenNext）

```bash
cd frontend
# OpenNext向けビルドとデプロイ
bun run opennext:build   # または npm run opennext:build
bun run opennext:deploy  # または npm run opennext:deploy
```

`frontend/wrangler.toml` を使って Workers にデプロイします。Cloudflare のビルドコマンドは `bun run opennext:build`、デプロイコマンドは `bun run opennext:deploy` を指定してください。`build` スクリプトは `next build` のままにしておき、OpenNext を呼ぶときは `opennext:build` を使います。ビルド時に `NEXT_PUBLIC_API_BASE_URL` などの環境変数を Cloudflare 側に設定してください（設定が無いとクライアント側にlocalhostが埋め込まれます）。

## ライセンス

MIT
