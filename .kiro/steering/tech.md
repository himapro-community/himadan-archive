# Tech Stack & Architecture

## Stack

- **Backend**: Fastify (TypeScript), Prisma ORM, SQLite
- **Frontend**: React + Vite (TypeScript), Tailwind CSS
- **Hosting**: Fly.io (backend + SQLite on same machine)
- **CI/CD**: GitHub Actions
- **Slack SDK**: `@slack/web-api`

## Crawler Architecture

### Scripts
- `run-all.ts` — Full crawl, fetches past 90 days for all target channels. Run once on initial setup.
- `run.ts` — Full crawl for a single specified channel.
- `run-diff.ts` — Differential crawl. Fetches only new messages since last saved `slackTs`, then re-syncs thread replies within the active window. Runs daily via GitHub Actions (JST 0:00).

### Thread Reply Sync Strategy (`run-diff.ts`)
The differential crawl has two phases per channel:

1. **New messages** (`saveMessages`): Fetches messages newer than the latest `slackTs` in DB. For any new parent message with `reply_count > 0`, immediately fetches its replies.

2. **Thread re-sync** (`syncRecentThreadReplies`): Re-fetches replies for threads that may have received new replies since they were first saved. Covers:
   - All threads with `replyCount > 0` in DB (within Slack's 90-day API window)
   - All messages from the last 30 days regardless of `replyCount` (to catch first replies to previously reply-less messages)
   - Skips threads already fetched in phase 1 to avoid duplicate API calls.

**Why the 90-day cap on thread re-sync**: Slack free plan does not return data older than 90 days via API. Calling `conversations.replies` on older messages is wasteful and returns nothing.

**Remaining edge case**: A message saved more than 30 days ago with `replyCount = 0` that receives its very first reply will not be detected. This is accepted as a rare scenario.

### Rate Limiting
Slack Tier 3 API: 50 req/min → 1.2s sleep between requests (`FETCH_DELAY_MS`).

### SQLite + WAL Mode
Crawler and web server run as separate processes on the same Fly.io machine. SQLite WAL mode allows concurrent reads during crawler writes, so the website stays available during crawl runs.

## GitHub Actions

- **Crawler** (`crawler.yml`): Runs `run-diff.js` on Fly.io daily at JST 0:00 via `flyctl ssh console`.
- **Deploy** (`deploy.yml`, `deploy-frontend.yml`): Deploys backend and frontend on push to main.
