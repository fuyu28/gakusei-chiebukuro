# Docker 使用ガイド

学生知恵袋プロジェクトをDockerコンテナで実行するためのガイドです。

## 前提条件

以下のソフトウェアがインストールされている必要があります：

- Docker (v20.10以降)
- Docker Compose (v2.0以降)

### インストール確認

```bash
docker --version
docker-compose --version
```

## クイックスタート

### 1. 環境変数の設定

バックエンドの環境変数ファイル（`.env`）を設定してください：

```bash
cd backend
cp .env.example .env
# .envファイルを編集してSupabaseの認証情報を設定
```

必要な環境変数：
- `SUPABASE_URL`: SupabaseプロジェクトのURL
- `SUPABASE_ANON_KEY`: Supabase匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseサービスロールキー
- `REQUIRE_EMAIL_VERIFICATION`: メール認証の有効/無効（true/false）

### 2. Dockerコンテナの起動

プロジェクトルートディレクトリで以下のコマンドを実行：

```bash
docker-compose up -d
```

オプション：
- `-d`: バックグラウンドで実行（デタッチモード）
- `--build`: イメージを強制的に再ビルド

### 3. アプリケーションへのアクセス

コンテナが起動したら、以下のURLでアクセスできます：

- **フロントエンド**: http://localhost
- **バックエンドAPI**: http://localhost:3000
- **ヘルスチェック**: http://localhost:3000/api/health

## Docker コマンド

### コンテナの起動

```bash
# フォアグラウンドで起動（ログを表示）
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# イメージを再ビルドして起動
docker-compose up --build
```

### コンテナの停止

```bash
# コンテナを停止
docker-compose stop

# コンテナを停止して削除
docker-compose down

# コンテナ、ネットワーク、ボリュームをすべて削除
docker-compose down -v
```

### ログの確認

```bash
# 全サービスのログを表示
docker-compose logs

# 特定のサービスのログを表示
docker-compose logs backend
docker-compose logs frontend

# ログをフォロー（リアルタイムで表示）
docker-compose logs -f

# 最新の100行のみ表示
docker-compose logs --tail=100
```

### コンテナの状態確認

```bash
# 実行中のコンテナを表示
docker-compose ps

# コンテナの詳細情報を表示
docker-compose ps -a
```

### コンテナ内でコマンド実行

```bash
# バックエンドコンテナに入る
docker-compose exec backend sh

# フロントエンドコンテナに入る
docker-compose exec frontend sh

# バックエンドでコマンドを実行
docker-compose exec backend npm run build
```

## トラブルシューティング

### ポートが既に使用されている

ポート80や3000が既に使用されている場合、`docker-compose.yml`のポートマッピングを変更してください：

```yaml
services:
  backend:
    ports:
      - "3001:3000"  # ホストの3001ポートにマッピング

  frontend:
    ports:
      - "8080:80"    # ホストの8080ポートにマッピング
```

### コンテナが起動しない

ログを確認してエラーを特定：

```bash
docker-compose logs backend
docker-compose logs frontend
```

よくある原因：
- `.env`ファイルが設定されていない
- Supabaseの認証情報が間違っている
- ポートの競合

### イメージの再ビルド

コードを変更した場合、イメージを再ビルドする必要があります：

```bash
# すべてのイメージを再ビルド
docker-compose build

# 特定のサービスのみ再ビルド
docker-compose build backend

# キャッシュを使わずに再ビルド
docker-compose build --no-cache
```

### データベースのリセット

コンテナとボリュームをすべて削除して、クリーンな状態から開始：

```bash
docker-compose down -v
docker-compose up -d
```

## 本番環境へのデプロイ

### 環境変数の設定

本番環境では、以下の環境変数を適切に設定してください：

```bash
NODE_ENV=production
PORT=3000
SUPABASE_URL=<your-production-supabase-url>
SUPABASE_ANON_KEY=<your-production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>
REQUIRE_EMAIL_VERIFICATION=true
```

### セキュリティ考慮事項

1. **環境変数の管理**: `.env`ファイルをGitにコミットしない
2. **CORS設定**: 本番環境のドメインを許可リストに追加
3. **HTTPS**: 本番環境ではHTTPSを使用（リバースプロキシ経由）
4. **シークレットの管理**: Docker Secretsまたは環境変数管理ツールを使用

## Docker Compose設定

### サービス構成

- **backend**: Node.js + Hono API (ポート3000)
- **frontend**: Nginx静的ファイルサーバー (ポート80)

### ネットワーク

すべてのサービスは`app-network`ブリッジネットワークで接続されています。

### ヘルスチェック

バックエンドサービスには自動ヘルスチェックが設定されており、30秒ごとに`/api/health`エンドポイントを確認します。

## 開発環境での使用

開発中は、ホットリロード機能を使いたい場合があります。その場合は、Dockerを使わずにローカルで起動することをおすすめします：

```bash
# バックエンド
cd backend
npm install
npm run dev

# フロントエンド（別のターミナル）
cd frontend
# 静的ファイルサーバーを起動（例：live-server）
npx live-server --port=8080
```

## 参考リンク

- [Docker公式ドキュメント](https://docs.docker.com/)
- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
- [プロジェクトREADME](./README.md)
