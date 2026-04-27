# Known Issues & Tech Debt

Minor issues that are not worth fixing immediately but should be kept in mind.

---

## Crawler

### `slackTs` has no database index
- **File**: `packages/backend/prisma/schema.prisma`
- `slackTs` is used in `ORDER BY` and range comparisons (`gte`) in the crawler, but only `channelId`, `threadTs`, and `userId` are indexed.
- No practical impact for the current small dataset, but would matter at scale.

### `Number(latest.slackTs) + 1` may skip same-second messages
- **File**: `packages/backend/src/crawler/run-diff.ts:50`
- Slack timestamps are floats with microsecond precision (e.g. `1745123456.789012`). Adding `1` advances by a full second, so messages posted within the same second as the latest saved message could theoretically be skipped on the next diff run.
- Very unlikely to cause real missing messages in practice.

### `orderBy: { slackTs: 'desc' }` is string-sorted in SQLite
- **File**: `packages/backend/src/crawler/run-diff.ts:46`
- `slackTs` is stored as a `String` column. SQLite sorts it lexicographically, which happens to be correct for Slack timestamps (all have 10-digit integer parts). Safe for now, but fragile — would break if timestamp format ever changed.

### Messages with `replyCount = 0` older than 30 days won't get first-reply detected
- **File**: `packages/backend/src/crawler/save-to-db.ts` — `syncRecentThreadReplies`
- A message saved more than 30 days ago with no replies, that later receives its first reply, will not be detected by the diff crawler.
- Accepted as a rare edge case. The 30-day window covers the vast majority of real scenarios.

### Deleted replies leave stale `replyCount` in DB
- **File**: `packages/backend/src/crawler/save-to-db.ts:168`
- `replyCount` is only updated when `replies.length > 0`. If all replies to a thread are deleted on Slack, the DB retains the old non-zero count.
- Cosmetic issue only — the missing reply messages themselves are not shown in the UI.
