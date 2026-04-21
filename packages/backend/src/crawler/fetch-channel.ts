import { getSlackClient, sleep } from './slack-client.js'
import type { SlackMessage, SlackUserProfile } from './types.js'

const FETCH_DELAY_MS = 1200 // Tier 3: 50 req/min → 1.2秒間隔で安全圏

// ユーザー情報を実行中にキャッシュしてAPI呼び出しを節約
const userCache = new Map<string, SlackUserProfile>()

export async function fetchUserProfile(userId: string): Promise<SlackUserProfile | null> {
  if (userCache.has(userId)) return userCache.get(userId)!

  try {
    const client = getSlackClient()
    const res = await client.users.info({ user: userId })
    await sleep(FETCH_DELAY_MS)

    if (!res.user || !res.user.id || !res.user.team_id) return null

    const profile: SlackUserProfile = {
      slackUserId: res.user.id,
      teamId: res.user.team_id,
      displayName: res.user.profile?.display_name || res.user.name || userId,
      realName: res.user.profile?.real_name || res.user.name || userId,
      avatarUrl: res.user.profile?.image_72 ?? undefined,
    }

    userCache.set(userId, profile)
    return profile
  } catch (err: any) {
    const code = err?.data?.error
    if (code === 'missing_scope') {
      // 一度だけ警告を出す（スコープ不足は全ユーザーで同じなので大量出力を防ぐ）
      if (!userCache.has('__scope_warned__')) {
        console.warn('[warn] users:read スコープが不足しています。Slack App の OAuth Scopes を確認してください。')
        userCache.set('__scope_warned__', {} as any)
      }
    } else if (code !== 'user_not_found' && code !== 'account_inactive') {
      console.warn(`[warn] users.info(${userId}) 失敗: ${code ?? err?.message}`)
    }
    return null
  }
}

export async function fetchChannelMessages(
  channelId: string,
  options: { oldest?: string; latest?: string } = {}
): Promise<SlackMessage[]> {
  const client = getSlackClient()
  const allMessages: SlackMessage[] = []
  let cursor: string | undefined

  console.log(`  [history] チャンネル ${channelId} のメッセージ取得開始...`)

  do {
    const res = await client.conversations.history({
      channel: channelId,
      oldest: options.oldest,
      latest: options.latest,
      limit: 200,
      cursor,
    })

    await sleep(FETCH_DELAY_MS)

    const messages = (res.messages ?? []) as SlackMessage[]
    allMessages.push(...messages)

    console.log(`  [history] ${allMessages.length} 件取得済み (has_more: ${res.has_more})`)

    cursor = res.has_more ? res.response_metadata?.next_cursor : undefined
  } while (cursor)

  return allMessages
}

export async function fetchThreadReplies(
  channelId: string,
  threadTs: string
): Promise<SlackMessage[]> {
  const client = getSlackClient()
  const allReplies: SlackMessage[] = []
  let cursor: string | undefined

  do {
    const res = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: 200,
      cursor,
    })

    await sleep(FETCH_DELAY_MS)

    // 最初の要素は親メッセージ自身なのでスキップ
    const replies = ((res.messages ?? []) as SlackMessage[]).slice(1)
    allReplies.push(...replies)

    cursor = res.has_more ? res.response_metadata?.next_cursor : undefined
  } while (cursor)

  return allReplies
}
