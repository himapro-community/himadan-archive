import { PrismaClient } from '@prisma/client'
import { fetchUserProfile, fetchThreadReplies } from './fetch-channel.js'
import type { SlackMessage } from './types.js'

export async function upsertChannel(
  prisma: PrismaClient,
  slackId: string,
  name: string
): Promise<string> {
  const channel = await prisma.channel.upsert({
    where: { slackId },
    update: { name },
    create: { slackId, name },
  })
  return channel.id
}

async function upsertUser(prisma: PrismaClient, slackUserId: string): Promise<string | null> {
  const profile = await fetchUserProfile(slackUserId)
  if (!profile) return null

  const user = await prisma.user.upsert({
    where: { slackUserId },
    update: {
      displayName: profile.displayName,
      realName: profile.realName,
      avatarUrl: profile.avatarUrl,
    },
    create: {
      slackUserId: profile.slackUserId,
      teamId: profile.teamId,
      displayName: profile.displayName,
      realName: profile.realName,
      avatarUrl: profile.avatarUrl,
      isApproved: false,
    },
  })
  return user.id
}

async function upsertMessage(
  prisma: PrismaClient,
  channelId: string,
  msg: SlackMessage,
  userId: string | null
): Promise<string> {
  const message = await prisma.message.upsert({
    where: { channelId_slackTs: { channelId, slackTs: msg.ts } },
    update: {
      text: msg.text,
      replyCount: msg.reply_count ?? 0,
      slackUserId: msg.user ?? null,
      senderName: msg.bot_profile?.name ?? msg.username ?? null,
      userId,
    },
    create: {
      channelId,
      slackTs: msg.ts,
      slackUserId: msg.user ?? null,
      senderName: msg.bot_profile?.name ?? msg.username ?? null,
      userId,
      text: msg.text,
      // Slack sets thread_ts === ts on parent messages; only treat as reply when different
      threadTs: msg.thread_ts && msg.thread_ts !== msg.ts ? msg.thread_ts : null,
      replyCount: msg.reply_count ?? 0,
    },
  })

  // 添付ファイルの upsert
  if (msg.files && msg.files.length > 0) {
    for (const file of msg.files) {
      if (!file.url_private) continue
      await prisma.file.upsert({
        where: {
          // slackUrl を一意キーにするため schema に追加が必要（後述）
          id: `${message.id}_${file.id}`,
        },
        update: {},
        create: {
          id: `${message.id}_${file.id}`,
          messageId: message.id,
          slackUrl: file.url_private,
          mimeType: file.mimetype ?? null,
          name: file.name ?? null,
        },
      })
    }
  }

  return message.id
}

export async function saveMessages(
  prisma: PrismaClient,
  channelId: string,
  messages: SlackMessage[],
  slackChannelId: string
): Promise<Set<string>> {
  let saved = 0
  let threadsProcessed = 0
  const fetchedThreadTs = new Set<string>()

  for (const msg of messages) {
    // bot_id のみで user がない場合はスキップ or null
    const userId = msg.user ? await upsertUser(prisma, msg.user) : null

    await upsertMessage(prisma, channelId, msg, userId)
    saved++

    // スレッドの返信を取得して保存
    if (msg.reply_count && msg.reply_count > 0) {
      console.log(`  [thread] ts=${msg.ts} の返信 ${msg.reply_count} 件を取得中...`)
      const replies = await fetchThreadReplies(slackChannelId, msg.ts)

      for (const reply of replies) {
        const replyUserId = reply.user ? await upsertUser(prisma, reply.user) : null
        await upsertMessage(prisma, channelId, reply, replyUserId)
      }

      fetchedThreadTs.add(msg.ts)
      threadsProcessed++
    }

    if (saved % 50 === 0) {
      console.log(`  [save] ${saved}/${messages.length} 件保存済み`)
    }
  }

  console.log(`  [save] 完了: メッセージ ${saved} 件, スレッド ${threadsProcessed} 件`)
  return fetchedThreadTs
}

export async function syncRecentThreadReplies(
  prisma: PrismaClient,
  channelId: string,
  slackChannelId: string,
  skipTs?: Set<string>
): Promise<void> {
  // Slack無料プランはAPIで取得できるのが直近90日分のみ
  const ninetyDaysAgo = String(Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000))
  const thirtyDaysAgo = String(Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000))

  const parents = await prisma.message.findMany({
    where: {
      channelId,
      threadTs: null,
      slackTs: { gte: ninetyDaysAgo },
      OR: [
        { replyCount: { gt: 0 } },
        { slackTs: { gte: thirtyDaysAgo } },
      ],
    },
    select: { slackTs: true },
  })

  const targets = skipTs ? parents.filter((p) => !skipTs.has(p.slackTs)) : parents

  if (targets.length === 0) return

  console.log(`  [thread-sync] ${targets.length} 件のスレッドを再同期中...`)

  for (const parent of targets) {
    const replies = await fetchThreadReplies(slackChannelId, parent.slackTs)
    for (const reply of replies) {
      const replyUserId = reply.user ? await upsertUser(prisma, reply.user) : null
      await upsertMessage(prisma, channelId, reply, replyUserId)
    }
    if (replies.length > 0) {
      await prisma.message.update({
        where: { channelId_slackTs: { channelId, slackTs: parent.slackTs } },
        data: { replyCount: replies.length },
      })
    }
  }

  console.log(`  [thread-sync] 完了: ${targets.length} スレッド再同期`)
}
