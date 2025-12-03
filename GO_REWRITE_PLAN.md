# Go版バックエンド移行 方針とAPI仕様

## 目的・前提
- 現行: `backend` は Hono(TypeScript) + Supabase で REST 提供。約 1.3k 行。
- 目標: Go + chi で同等 API を提供し、フロントのレスポンス互換を維持。
- Supabase は引き続き利用（Auth/PostgREST/Storage）。ネットワーク越しの HTTP クライアントで実装する。

## 技術スタック
- Web フレームワーク: chi (`github.com/go-chi/chi/v5`)
- ミドルウェア: chi/middleware (RequestID, Logger, Recover, CORS), カスタム Auth/Admin
- バリデーション: `github.com/go-playground/validator/v10`
- 環境変数管理: `github.com/joho/godotenv` (開発時)
- Supabase クライアント: `supabase-community/supabase-go` もしくは PostgREST/Gotrue を直接叩く薄いクライアント
- ログ: 標準ライブラリ log で JSON 風出力、後続で zap などに差し替え可能

## ディレクトリ案
```
backend-go/
  cmd/api/main.go
  internal/
    config/
    http/
      middleware/
      handler/   // auth, threads, answers, subject-tags, past-exams, admin
    service/     // ビジネスロジック
    repository/  // Supabaseアクセス（Auth/PostgREST/Storage）
    supabase/    // クライアント生成・共通ヘルパ
    model/       // リクエスト/レスポンス/DBモデル
  go.mod / go.sum
```

## ミドルウェア方針
- CORS: 現行許可オリジン（`http://localhost:8080`, `http://127.0.0.1:8080`, `http://localhost`, `http://localhost:80`）を設定。Credentials 許可。
- Auth: `Authorization: Bearer <token>` を Gotrue `/auth/v1/user` で検証し、`context` に `user_id`, `email`, `role` を格納。バン状態は profiles 参照。
- Admin: profiles の `is_admin` true を確認。
- エラー: 共通ハンドラで `{message, code?}` を JSON 返却し、ステータスは TS 実装と合わせる。

## 環境変数
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_EMAIL_DOMAIN` (default: `ccmailg.meijo-u.ac.jp`)
- `REQUIRE_EMAIL_VERIFICATION`, `EMAIL_REDIRECT_TO`
- `SUPABASE_PAST_EXAM_BUCKET` (default: `past-exams`)
- `PORT` (default: `3000`)

## API仕様（互換を維持）
ベースパス `/api`。JSON キーは camelCase。日付は ISO8601。

### ヘルス
- `GET /` -> `{message,status}`
- `GET /health` -> `{status,timestamp}`

### 認証 `/api/auth`
- `POST /signup` (public) body `{email,password,display_name?}` -> 200 `{message,user:{id,email}}`
- `POST /login` (public) body `{email,password}` -> 200 `{message,access_token,user:{id,email}}`
- `POST /logout` (auth) -> 200 `{message}`
- `GET /me` (auth) -> 200 `{user:{id,email,display_name,created_at,is_banned,is_admin}}`

### スレッド `/api/threads`
- `GET /` (public) q: `status?`, `subject_tag_id?`, `sort?=created_at`, `order?=asc|desc` -> `{threads:[{id,title,content,subject_tag:{id,name},user:{id,email,display_name},answers_count,...}]}`
- `GET /:id` (public) -> `{thread:{...subject_tag,user}}`
- `POST /` (auth) body `{title,content,subject_tag_id,deadline?ISO}` -> 201 `{message,thread}`
- `PATCH /:id` (auth+owner) body `{status?,deadline?}` -> `{message,thread}`
- `DELETE /:id` (auth+owner) -> `{message}`

### 回答 `/api/answers`
- `GET /threads/:thread_id` (public) -> `{answers:[{id,thread_id,content,is_best_answer,user:{...}}]}` (BA が先頭)
- `POST /` (auth) body `{thread_id,content}` -> 201 `{message,answer}` （締切・resolved チェック）
- `PATCH /:id/best` (auth+thread owner) -> `{message,answer}` （BA 再設定＋thread.status=resolved）
- `DELETE /:id` (auth+owner) -> `{message}`

### 科目タグ `/api/subject-tags`
- `GET /` (public) -> `{tags:[{id,name}]}`
- `POST /` (auth想定/現状open) body `{name}` -> 201 `{message,tag}` （Go化時に admin 制限を追加予定）

### 過去問 `/api/past-exams`
- `GET /` (public) q: `subject_tag_id?` -> `{files:[{id,title,subject_tag:{id,name},uploader:{id,email,display_name},download_url?,file_type,file_size,created_at}]}`
- `POST /` (auth) multipart `file`, `subject_tag_id`, `title?` -> 201 `{message,file}`
  - MIME: `application/pdf`, `image/jpeg`, `image/png`
  - サイズ: <= 10MB
  - Storage にアップロード後、DB に保存し署名 URL を付与

### 管理 `/api/admin` (auth + is_admin)
- `GET /users` -> `{users:[{id,email,display_name,is_banned,created_at,is_admin?}]}`
- `PATCH /users/:id/ban` body `{is_banned:boolean}` -> `{message,user}`

## バリデーション・エラー
- `validator` タグで入力チェック。UUID/メール/必須/範囲などを定義。
- 締切・解決済みチェック、所有権チェックは service 層で実施。
- エラー時は HTTP ステータス (`400/401/403/404/500`) とメッセージを現行に揃える。

## ストレージ・ファイル
- バケット: `SUPABASE_PAST_EXAM_BUCKET`（デフォルト `past-exams`）
- ファイル名サニタイズ: `[^a-zA-Z0-9_.-]` を `_` に置換
- 署名 URL 有効期限: 1 時間

## 開発フロー案
1. ベースセットアップ: Go モジュール init, chi ルータとミドルウェア、ヘルスチェック。
2. Supabase クライアント層: Auth/Gotrue, PostgREST, Storage の薄ラッパ実装。
3. 認証・プロフィールハンドラ移植（`/auth`）。
4. スレッド/回答/タグ/過去問/管理の順に handler/service/repository を移植。
5. バリデーション・エラー共通化、レスポンススキーマ確認。
6. Docker Compose 更新とローカル起動確認、簡易統合テスト（ハッピーパス + 権限周り）。

## 想定工数
- 4–5 営業日（Go/Supabase 経験者の場合）、学習込みは +2–3 日を目安。

## リスクと対策
- Supabase Go SDK の挙動差異: Gotrue/PostgREST API 仕様を事前確認し、必要なら直接 HTTP で叩く。
- 管理者判定/バン判定: profiles 参照とメタデータ整合性を確認する簡易テストを用意。
- レスポンス互換性: フロントが参照するフィールドを一覧化し、差分が出ないようスナップショットテストを検討。
