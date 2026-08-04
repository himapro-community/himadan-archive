# Himadan Archive / ひまプロアーカイブ

A web app for archiving and browsing past logs from Himapro Danwashitsu (Slack).  
ひまプロ談話室（Slack）の過去ログを永続化・閲覧するためのWebアプリ。

- **Frontend / フロントエンド**: https://himadan-archive.vercel.app
- **Backend / バックエンド**: https://himadan-archive.fly.dev

## Tech Stack / 技術スタック

| Role | Technology |
|------|------------|
| Frontend | React + Vite + Tailwind CSS (Vercel) |
| Backend | Fastify + Prisma + SQLite (Fly.io) |
| Language | TypeScript |
| Package Manager | pnpm monorepo |

| 役割 | 技術 |
|------|------|
| フロントエンド | React + Vite + Tailwind CSS（Vercel） |
| バックエンド | Fastify + Prisma + SQLite（Fly.io） |
| 言語 | TypeScript |
| パッケージ管理 | pnpm モノレポ |

## Local Development / ローカル開発

### Prerequisites / 前提

- Node.js 20+
- pnpm

### Setup / セットアップ

```bash
# Install dependencies / 依存インストール
pnpm install

# Create .env / .env を作成
cp packages/backend/.env.example packages/backend/.env
# Set SLACK_BOT_TOKEN, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, etc.
# SLACK_BOT_TOKEN, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET などを設定

# DB migration / DBマイグレーション
pnpm --filter backend db:migrate

# Start (backend + frontend) / 起動（バックエンド + フロントエンド）
pnpm dev:backend  # http://localhost:3001
pnpm dev:frontend # http://localhost:5173
```

## Crawler / クローラー

Fetches messages from the Slack API and saves them to the DB.  
Slack APIからメッセージを取得してDBに保存する。

```bash
# Initial: fetch past 90 days for all channels / 初回：全チャンネルの過去90日分を取得
pnpm --filter backend crawler:all

# Diff: fetch only new messages since last run / 差分：前回取得以降の新着メッセージのみ取得
pnpm --filter backend crawler:diff

# Specific channel only / 特定チャンネルのみ
pnpm --filter backend crawler -- --channel general
```

The diff crawler **runs automatically every day at midnight (JST) via GitHub Actions**.  
差分クローラーは **毎日0時（JST）にGitHub Actionsで自動実行**される。  
→ `.github/workflows/crawler.yml`

### Manual Execution (GitHub Actions) / クローラーの手動実行（GitHub Actions）

1. Open the **Actions** tab in the GitHub repository / GitHubリポジトリの **Actions** タブを開く
2. Select **Daily Crawler** / **Daily Crawler** を選択
3. Click **Run workflow** / **Run workflow** をクリック

## Error Notifications / エラー通知

When the diff crawler fails or the Fastify backend returns a 5xx response, an error message is posted to a Slack channel via the existing crawler bot.
差分クローラーが失敗したとき、または Fastify バックエンドが 5xx を返したときに、既存のクローラー Bot 経由で Slack チャンネルへエラーメッセージを投稿する。

- Implementation / 実装: `packages/backend/src/lib/notify.ts`
- Default channel / 既定の送信先: `C0B36B3A6D7` (override with `SLACK_ALERT_CHANNEL` / `SLACK_ALERT_CHANNEL` で上書き可能)
- Required Slack scope / 必要な Slack スコープ: `chat:write` (the bot must be invited to the destination channel / Bot を送信先チャンネルに招待しておくこと)
- Disable / 無効化: unset `SLACK_BOT_TOKEN` and the notifier becomes a no-op / `SLACK_BOT_TOKEN` を外せば通知は no-op になる

Send a test notification / テスト通知を送る：

```bash
cd packages/backend
npx tsc
node dist/lib/notify-test.js
```

### Slack-independent fallback / Slack非依存の保険（2026-08-04〜）

The Slack notifier above goes silent together with a dead `SLACK_BOT_TOKEN` — this actually happened in 2026-05〜07 (token revoked → crawler failed daily for ~3 months → GitHub auto-disabled the workflow after 60 days of repo inactivity, all without a single notification).
上記のSlack通知は `SLACK_BOT_TOKEN` が死ぬと**一緒に沈黙する**（2026-05〜07 に実際に発生: トークン失効→毎日失敗→60日ルールで自動停止まで無通知）。

- `crawler.yml` が失敗時に GitHub Issue（label: `crawler-failure`）を自動作成（重複防止つき）
- honnemaru リポの番人（watchdog）が毎朝 open Issue と failing run を拾い、**Webhook 経路**（Bot Token 非依存）で Slack に通知 = 通知経路が分離される
- `FLY_API_TOKEN` が空の場合は fail-fast で即エラー表示（2026-07 の原因特定を遅らせた generic エラー対策）

## Deploy / デプロイ

### Backend (Fly.io) / バックエンド（Fly.io）

Pushing changes under `packages/backend/` to `main` triggers **automatic deployment via GitHub Actions**.  
`packages/backend/` 配下の変更を `main` にプッシュすると **GitHub Actions が自動デプロイ**する。  
→ `.github/workflows/deploy.yml`

Manual deploy / 手動デプロイ：

```bash
fly deploy --app himadan-archive
```

### Frontend (Vercel) / フロントエンド（Vercel）

GitHub auto-integration is not configured, so manual deployment is required:  
GitHub との自動連携は未設定のため、手動デプロイが必要：

```bash
cd packages/frontend
vercel --prod
```

> **Why there is no CI workflow for the frontend / フロントに CI がない理由（2026-08-04 調査で確定）**
> A `deploy-frontend.yml` existed but was **deleted**: it ran exactly once (2026-04-25), failed, and never ran again — the `VERCEL_TOKEN` secret it required **was never created**, so it could not have succeeded even once. The site stayed current because that commit was deployed by hand with the command above. Leaving a permanently-failing workflow in place produced a false alarm in the watchdog every day, which is worse than having no workflow.
> `deploy-frontend.yml` は**削除済み**。生涯で1回だけ実行(2026-04-25)して失敗し、以降一度も走っていない。必要な `VERCEL_TOKEN` シークレットは**そもそも作られたことがない**ため、構造的に一度も成功し得なかった（当時のコードが本番に載っているのは上の手動コマンドでデプロイされたから）。永久に失敗し続ける workflow は番人に毎日 偽の警報を出させるだけなので撤去した。
>
> To restore automation / 自動化を戻したい場合: connect the Vercel project to this repo (Vercel dashboard → Project → Settings → Git). That is preferable to a token-based workflow — no secret to rotate, and it consumes no GitHub Actions minutes.
> Vercel ダッシュボード → Project → Settings → Git でこのリポジトリを接続するのが最善（トークン管理が不要で、GitHub Actions の分も消費しない）。

### Environment Variables / 環境変数

#### Fly.io Secrets (`fly secrets set KEY=VALUE --app himadan-archive`) / Fly.io シークレット

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | SQLite path (`file:/data/prod.db`) |
| `SLACK_BOT_TOKEN` | Slack Bot Token (for crawler) |
| `SLACK_CLIENT_ID` | Slack OAuth Client ID |
| `SLACK_CLIENT_SECRET` | Slack OAuth Client Secret |
| `SLACK_TEAM_ID` | Himapro Danwashitsu Team ID |
| `JWT_SECRET` | JWT signing secret (random, 32+ chars) |
| `FRONTEND_URL` | Frontend URL (for CORS) |
| `API_URL` | Backend public URL |
| `SLACK_ALERT_CHANNEL` | (optional) Error notification channel ID, defaults to `C0B36B3A6D7` |

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
| `SLACK_ALERT_CHANNEL` | （任意）エラー通知の送信先チャンネルID。未設定時は `C0B36B3A6D7` |

#### GitHub Secrets (Repository Settings → Secrets and variables → Actions) / GitHub Secrets

| Key | Description |
|-----|-------------|
| `FLY_API_TOKEN` | Obtained with `fly tokens create deploy` (required for backend auto-deploy) |

| キー | 説明 |
|------|------|
| `FLY_API_TOKEN` | `fly tokens create deploy` で取得（バックエンド自動デプロイに必要） |

#### Vercel Environment Variables / Vercel 環境変数

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://himadan-archive.fly.dev` |

## DB Upload (Initial or Reset) / DBのアップロード（初回 or リセット時）

```bash
# Delete existing DB on Fly.io / Fly.io上の既存DBを削除
fly ssh console --app himadan-archive -C "rm /data/prod.db"

# Upload local DB / ローカルのDBをアップロード
fly ssh sftp put packages/backend/prisma/dev.db /data/prod.db --app himadan-archive

# Restart the app / アプリを再起動
fly machine restart --app himadan-archive
```
