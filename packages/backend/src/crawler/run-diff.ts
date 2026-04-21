import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { getSlackClient, sleep } from './slack-client.js'
import { fetchChannelMessages } from './fetch-channel.js'
import { upsertChannel, saveMessages } from './save-to-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env') })

function isTargetChannel(name: string): boolean {
  if (name.startsWith('times-')) return false
  if (name === 'general') return true
  if (name.startsWith('social-')) return true
  if (name === 'ask-なんでも') return true
  return false
}

const prisma = new PrismaClient()

try {
  const client = getSlackClient()

  console.log(`[diff] ${new Date().toISOString()} 差分取得開始`)

  const listRes = await client.conversations.list({ limit: 1000, types: 'public_channel' })
  await sleep(1200)

  const targets = (listRes.channels ?? []).filter(
    (c) => c.name && isTargetChannel(c.name) && !c.is_archived
  )

  let totalNew = 0

  for (const channel of targets) {
    if (!channel.id || !channel.name) continue

    // チャンネルの最新 slackTs を取得して oldest に使う
    const dbChannel = await prisma.channel.findUnique({ where: { slackId: channel.id } })

    let oldest: string | undefined
    if (dbChannel) {
      const latest = await prisma.message.findFirst({
        where: { channelId: dbChannel.id },
        orderBy: { slackTs: 'desc' },
        select: { slackTs: true },
      })
      // 最新TSの1秒後から取得（重複を避ける）
      if (latest) oldest = String(Number(latest.slackTs) + 1)
    }

    // oldest が未設定 = 新規チャンネル → 過去90日分を取得
    if (!oldest) {
      oldest = String(Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000))
    }

    const messages = await fetchChannelMessages(channel.id, { oldest })

    if (messages.length === 0) continue

    console.log(`  #${channel.name}: ${messages.length} 件の新着`)

    try {
      await client.conversations.join({ channel: channel.id })
      await sleep(1200)
    } catch (err: any) {
      const code = err?.data?.error
      if (code !== 'already_in_channel' && code !== 'method_not_supported_for_channel_type') {
        console.warn(`  [skip] join 失敗 (${code})`)
        continue
      }
    }

    const dbChannelId = await upsertChannel(prisma, channel.id, channel.name)
    await saveMessages(prisma, dbChannelId, messages, channel.id)
    totalNew += messages.length
  }

  console.log(`[diff] 完了: 新着 ${totalNew} 件`)
} catch (err) {
  console.error('エラー:', err)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
