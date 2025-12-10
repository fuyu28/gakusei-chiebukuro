# プロジェクト技術概要

## 使用技術・ライブラリ・サービス

### フロントエンド（`frontend/`）
- Next.js 15（App Router） + React 19 / TypeScript
- Tailwind CSS 3 + PostCSS / Autoprefixer
- API クライアント（`lib/api.ts`）で fetch + localStorage を使った JWT 管理、Auth コンテキスト（`lib/auth-context.tsx`）でログイン状態を共有

### バックエンド（`backend/`）
- Hono 4（`@hono/node-server`）+ TypeScript + `tsx` ホットリロード
- Supabase JS SDK 2.87 で Auth / Postgres / Storage（`supabase` と `supabaseAdmin` の2クライアント）
- バリデーション: `@hono/zod-validator` + `zod`
- 環境変数: `dotenv`; 開発/本番とも `.env` 経由（`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` など）

### インフラ・運用
- Supabase（SaaS）
  - Auth（メールドメイン制限あり）、Postgres（RLS有効）、Storage バケット `past-exams` で過去問ファイルを保存
- Docker Compose（`docker-compose.yml`）で Next.js(8080) + Hono API(3000) を起動
- Cloudflare Workers 向け `wrangler.toml`（`node_compat` を有効化し Hono を Worker 互換で動作させる想定）

## アプリ構成のポイント
- フロント: `app/` 配下にトップ・ログイン/サインアップ・過去問ページを配置し、共通 UI は `components/`、型は `types/`。`NEXT_PUBLIC_API_BASE_URL` で接続先 API を切り替え。
- バックエンド: `src/index.ts` で CORS 設定・ヘルスチェック・各ルートを束ねる。
  - ルート: `/api/auth`, `/api/threads`, `/api/answers`, `/api/subject-tags`, `/api/admin`, `/api/past-exams`
  - ミドルウェア: `middleware/auth.ts` で Supabase JWT 検証・プロフィール自動生成・BAN 判定・管理者判定
  - サービス: `services/` でスレッド/回答/タグ/管理者/過去問のビジネスロジックを分離し、`lib/supabase.ts` のクライアントを利用
- データモデル（`backend/database/schema.sql`）: `profiles`（Auth 連携 + BAN フラグ）、`subject_tags`、`threads`（status, deadline）、`answers`（best フラグ）、`past_exam_files`（Storage の file_path と科目タグを保持）に対し RLS を適用し、公開閲覧 + 認証済みユーザーによる投稿を想定。

## UML 一覧

### システムアーキテクチャ
```mermaid
flowchart LR
  U[Browser\n学生/管理者] -->|HTTPS| FE[Next.js App Router\nReact 19 / Tailwind]
  FE -->|REST /api/*| BE[Hono API\nNode.js + Supabase SDK]
  BE -->|JWT検証| AUTH[Supabase Auth]
  BE -->|SQL| DB[(Supabase Postgres\nthreads / answers / tags / profiles / past_exam_files)]
  BE -->|Storage API| STG[Supabase Storage\nbucket: past-exams]
  STG -.signed URL.-> FE
```

### デプロイメント
```mermaid
flowchart TB
  subgraph Client
    U[Browser]
  end
  subgraph Container
    FE[Next.js 8080]
    BE[Hono API 3000]
  end
  subgraph Supabase[SaaS]
    AUTH[Auth]
    DB[(Postgres)]
    STG[(Storage\npast-exams)]
  end
  U --> FE
  FE --> BE
  BE --> AUTH
  BE --> DB
  BE --> STG
```

### データモデル（ER）
```mermaid
erDiagram
  PROFILES ||--o{ THREADS : "user_id"
  PROFILES ||--o{ ANSWERS : "user_id"
  PROFILES ||--o{ PAST_EXAM_FILES : "uploaded_by"
  SUBJECT_TAGS ||--o{ THREADS : "subject_tag_id"
  SUBJECT_TAGS ||--o{ PAST_EXAM_FILES : "subject_tag_id"
  THREADS ||--o{ ANSWERS : "thread_id"
  
  PROFILES {
    uuid id PK
    text email
    text display_name
    bool is_banned
    timestamptz created_at
  }
  SUBJECT_TAGS {
    serial id PK
    text name
    timestamptz created_at
  }
  THREADS {
    serial id PK
    text title
    text content
    text status
    timestamptz deadline
    uuid user_id FK
    int subject_tag_id FK
    timestamptz created_at
    timestamptz updated_at
  }
  ANSWERS {
    serial id PK
    int thread_id FK
    text content
    bool is_best_answer
    uuid user_id FK
    timestamptz created_at
    timestamptz updated_at
  }
  PAST_EXAM_FILES {
    serial id PK
    int subject_tag_id FK
    text title
    text file_path
    text file_type
    bigint file_size
    uuid uploaded_by FK
    timestamptz created_at
  }
```

### シーケンス（ログイン）
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js Frontend
  participant BE as Hono API
  participant AUTH as Supabase Auth
  U->>FE: メール/パスワード入力
  FE->>BE: POST /api/auth/login
  BE->>AUTH: auth.signInWithPassword
  AUTH-->>BE: JWT(access_token)
  BE-->>FE: JWT を返却
  FE->>FE: localStorage に保存 / AuthContext 更新
```

### シーケンス（過去問アップロード）
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js Frontend
  participant BE as Hono API
  participant STG as Supabase Storage
  participant DB as Supabase Postgres
  U->>FE: ファイル + subject_tag_id を選択
  FE->>BE: POST /api/past-exams (multipart/form-data)
  BE->>STG: Storage upload(file_path, buffer)
  STG-->>BE: upload result
  BE->>DB: INSERT past_exam_files
  DB-->>BE: レコード + relation
  BE->>STG: createSignedUrl(file_path)
  STG-->>BE: signed URL
  BE-->>FE: file metadata + download_url
  FE-->>U: 完了表示 / リスト更新
```

### ユースケース
```mermaid
flowchart LR
  actorStudent([学生]):::actor
  actorAdmin([管理者]):::actor

  ucPost((質問投稿))
  ucAnswer((回答投稿))
  ucBest((ベストアンサー選択))
  ucView((スレッド閲覧・検索))
  ucUpload((過去問アップロード))
  ucDownload((過去問ダウンロード))
  ucBan((ユーザーBAN/解除))
  ucManageTags((科目タグ管理))

  actorStudent --> ucPost
  actorStudent --> ucAnswer
  actorStudent --> ucBest
  actorStudent --> ucView
  actorStudent --> ucUpload
  actorStudent --> ucDownload

  actorAdmin --> ucBan
  actorAdmin --> ucManageTags
  actorAdmin --> ucView

  classDef actor fill:#f6f9ff,stroke:#4f46e5;
```

### アクティビティ（質問投稿〜回答完了）
```mermaid
flowchart TD
  A[ログイン確認] -->|未ログイン| B[ログインページへ遷移]
  A -->|ログイン済み| C[質問フォーム入力]
  C --> D{科目タグと本文が有効?}
  D -->|No| C
  D -->|Yes| E[POST /api/threads]
  E -->|成功| F[スレッド作成成功表示]
  F --> G[他ユーザーが回答を投稿]
  G --> H[質問者が回答を閲覧]
  H --> I{ベストアンサーを選ぶ?}
  I -->|No| H
  I -->|Yes| J[PATCH /api/answers/:id/best]
  J --> K[スレッドが解決済みステータス]
```

### クラス図（主要ドメイン）
```mermaid
classDiagram
  class Profile {
    uuid id
    string email
    string display_name
    bool is_banned
    timestamptz created_at
  }

  class SubjectTag {
    int id
    string name
    timestamptz created_at
  }

  class Thread {
    int id
    string title
    string content
    string status
    timestamptz deadline
    uuid user_id
    int subject_tag_id
    timestamptz created_at
    timestamptz updated_at
  }

  class Answer {
    int id
    int thread_id
    string content
    bool is_best_answer
    uuid user_id
    timestamptz created_at
    timestamptz updated_at
  }

  class PastExamFile {
    int id
    int subject_tag_id
    string title
    string file_path
    string file_type
    bigint file_size
    uuid uploaded_by
    timestamptz created_at
  }

  Profile "1" --> "*" Thread : posts
  Profile "1" --> "*" Answer : writes
  Profile "1" --> "*" PastExamFile : uploads
  SubjectTag "1" --> "*" Thread : categorizes
  SubjectTag "1" --> "*" PastExamFile : groups
  Thread "1" --> "*" Answer : has
```
