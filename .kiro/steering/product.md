# Product Overview

## Purpose

himadan-archive is a Slack archive viewer. It crawls target Slack channels and preserves messages beyond Slack's free plan retention limit, making them searchable and browsable via a web UI.

## Why This Exists

**Slack free plan retains only the last 90 days of messages via API.** Older messages become inaccessible through the API. This app crawls and stores messages into a local SQLite database so they remain accessible indefinitely after the 90-day window closes.

## Key Constraints

### Slack Free Plan — 90-Day API Limit
- `conversations.history` and `conversations.replies` can only fetch messages within the last 90 days.
- There is no point calling the Slack API for messages older than 90 days — it will return nothing or an error.
- The crawler must respect this limit when deciding which threads to re-sync.

### Target Channels
The crawler targets a specific subset of public channels (defined in `isTargetChannel`):
- `general`
- channels starting with `social-`
- `ask-なんでも`
- Excludes `times-*` channels

## Users

Internal members of the Slack workspace. Access is controlled by an approval flag (`isApproved`) on each user account.
