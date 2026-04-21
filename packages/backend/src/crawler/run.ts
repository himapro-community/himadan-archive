import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { getSlackClient } from './slack-client.js'
import { fetchChannelMessages } from './fetch-channel.js'
import { upsertChannel, saveMessages } from './save-to-db.js'

// モノレポルートの .env を読み込む
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../../../.env') })
config({ path: path.resolve(__dirname, '../../.env') }) // backend/.env も読み込み（上書きなし）

// ---- CLI 引数パース ----
const args = process.argv.slice(2)
const channelArg = args.find((a) => a.startsWith('--channel='))?.split('=')[1]
const daysArg = args.find((a) => a.startsWith('--days='))?.split('=')[1]

if (!channelArg) {
  console.error('使い方: tsx src/crawler/run.ts --channel=<channel-name-or-id> [--days=90]')
  process.exit(1)
}

const DAYS = daysArg ? Number(daysArg) : 90
const oldest = String(Math.floor((Date.now() - DAYS * 24 * 60 * 60 * 1000) / 1000))

// ---- メイン処理 ----
const prisma = new PrismaClient()

try {
  const client = getSlackClient()

  // チャンネル名 → Slack チャンネルID を解決
  console.log(`チャンネル "${channelArg}" を検索中...`)
  let slackChannelId = channelArg
  let channelName = channelArg

  if (!channelArg.startsWith('C')) {
    // ID ではなく名前で指定された場合、channels.list から検索
    const listRes = await client.conversations.list({ limit: 1000, types: 'public_channel' })
    const found = listRes.channels?.find((c) => c.name === channelArg)
    if (!found || !found.id) {
      console.error(`チャンネル "${channelArg}" が見つかりませんでした`)
      process.exit(1)
    }
    slackChannelId = found.id
    channelName = found.name ?? channelArg
  }

  console.log(`対象: #${channelName} (${slackChannelId}), 過去 ${DAYS} 日間`)

  // Bot をチャンネルに参加させる（すでに参加済みの場合は無視）
  try {
    await client.conversations.join({ channel: slackChannelId })
    console.log(`Bot が #${channelName} に参加しました`)
  } catch (err: any) {
    const code = err?.data?.error
    if (code === 'already_in_channel' || code === 'method_not_supported_for_channel_type') {
      // 参加済み or DMなど対象外 → 問題なし
    } else if (code === 'missing_scope') {
      console.error('エラー: Bot に channels:join スコープが不足しています。')
      console.error('Slack App の OAuth Scopes に channels:join を追加して再インストールしてください。')
      process.exit(1)
    } else {
      throw err
    }
  }

  // DB にチャンネルを登録
  const dbChannelId = await upsertChannel(prisma, slackChannelId, channelName)

  // メッセージ取得
  const messages = await fetchChannelMessages(slackChannelId, { oldest })

  console.log(`\n取得完了: ${messages.length} 件のメッセージ → DB に保存開始\n`)

  // DB 保存
  await saveMessages(prisma, dbChannelId, messages, slackChannelId)

  console.log('\n✓ 完了')
} catch (err) {
  console.error('エラーが発生しました:', err)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
