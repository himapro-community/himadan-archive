# ひまプロアーカイブ

ひまプロ談話室（Slack）の過去ログを永続化・閲覧するためのWebアプリ。

- **フロントエンド**: https://himadan-archive.vercel.app
- **バックエンド**: https://himadan-archive.fly.dev

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React + Vite + Tailwind CSS（Vercel） |
| バックエンド | Fastify + Prisma + SQLite（Fly.io） |
| 言語 | TypeScript |
| パッケージ管理 | pnpm モノレポ |

## ローカル開発

### 前提

- Node.js 20+
- pnpm

### セットアップ

```bash
# 依存インストール
pnpm install

# .env を作成
cp packages/backend/.env.example packages/backend/.env
# SLACK_BOT_TOKEN, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET などを設定

# DBマイグレーション
pnpm --filter backend db:migrate

# 起動（バックエンド + フロントエンド）
pnpm dev:backend  # http://localhost:3001
pnpm dev:frontend # http://localhost:5173
```

## クローラー

Slack APIからメッセージを取得してDBに保存する。

```bash
# 初回：全チャンネルの過去90日分を取得
pnpm --filter backend crawler:all

# 差分：前回取得以降の新着メッセージのみ取得
pnpm --filter backend crawler:diff

# 特定チャンネルのみ
pnpm --filter backend crawler -- --channel general
```

差分クローラーは **毎日0時（JST）にGitHub Actionsで自動実行**される。  
→ `.github/workflows/crawler.yml`

### クローラーの手動実行（GitHub Actions）

1. GitHubリポジトリの **Actions** タブを開く
2. **Daily Crawler** を選択
3. **Run workflow** をクリック

## デプロイ

### バックエンド（Fly.io）

`packages/backend/` 配下の変更を `main` にプッシュすると **GitHub Actions が自動デプロイ**する。  
→ `.github/workflows/deploy.yml`

手動デプロイ：

```bash
fly deploy --app himadan-archive
```

### フロントエンド（Vercel）

GitHub との自動連携は未設定のため、手動デプロイが必要：

```bash
cd packages/frontend
vercel --prod
```

### 環境変数

#### Fly.io シークレット（`fly secrets set KEY=VALUE --app himadan-archive`）

| キー | 説明 |
|------|------|
| `DATABASE_URL` | SQLiteパス（`file:/data/prod.db`） |
| `SLACK_BOT_TOKEN` | Slack Bot Token（クローラー用） |
| `SLACK_CLIENT_ID` | Slack OAuth クライアントID |
| `SLACK_CLIENT_SECRET` | Slack OAuth クライアントシークレット |
| `SLACK_TEAM_ID` | ひまプロ談話室のチームID |
| `JWT_SECRET` | JWTの署名シークレット（ランダム32文字以上） |
| `FRONTEND_URL` | フロントエンドURL（CORS用） |
| `API_URL` | バックエンドの公開URL |

#### GitHub Secrets（リポジトリの Settings → Secrets and variables → Actions）

| キー | 説明 |
|------|------|
| `FLY_API_TOKEN` | `fly tokens create deploy` で取得（バックエンド自動デプロイに必要） |

#### Vercel 環境変数

| キー | 値 |
|------|-----|
| `VITE_API_URL` | `https://himadan-archive.fly.dev` |

## DBのアップロード（初回 or リセット時）

```bash
# Fly.io上の既存DBを削除
fly ssh console --app himadan-archive -C "rm /data/prod.db"

# ローカルのDBをアップロード
fly ssh sftp put packages/backend/prisma/dev.db /data/prod.db --app himadan-archive

# アプリを再起動
fly machine restart --app himadan-archive
```
