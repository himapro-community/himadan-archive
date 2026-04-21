import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { getSlackClient, sleep } from './slack-client.js'
import { fetchChannelMessages } from './fetch-channel.js'
import { upsertChannel, saveMessages } from './save-to-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env') })

const args = process.argv.slice(2)
const daysArg = args.find((a) => a.startsWith('--days='))?.split('=')[1]
const DAYS = daysArg ? Number(daysArg) : 90
const oldest = String(Math.floor((Date.now() - DAYS * 24 * 60 * 60 * 1000) / 1000))

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

  console.log('対象チャンネル一覧を取得中...')
  const listRes = await client.conversations.list({ limit: 1000, types: 'public_channel' })
  await sleep(1200)

  const targets = (listRes.channels ?? []).filter(
    (c) => c.name && isTargetChannel(c.name) && !c.is_archived
  )

  console.log(`対象チャンネル: ${targets.length} 件`)
  targets.forEach((c) => console.log(`  - #${c.name} (${c.id})`))
  console.log()

  for (const [i, channel] of targets.entries()) {
    if (!channel.id || !channel.name) continue

    console.log(`\n[${ i + 1}/${targets.length}] #${channel.name} 処理開始...`)

    // Bot をチャンネルに参加
    try {
      await client.conversations.join({ channel: channel.id })
      await sleep(1200)
    } catch (err: any) {
      const code = err?.data?.error
      if (code !== 'already_in_channel' && code !== 'method_not_supported_for_channel_type') {
        console.warn(`  [skip] join 失敗 (${code}), スキップします`)
        continue
      }
    }

    const dbChannelId = await upsertChannel(prisma, channel.id, channel.name)
    const messages = await fetchChannelMessages(channel.id, { oldest })

    console.log(`  取得: ${messages.length} 件 → 保存開始`)
    await saveMessages(prisma, dbChannelId, messages, channel.id)
  }

  console.log('\n✓ 全チャンネルの取得・保存が完了しました')
} catch (err) {
  console.error('エラー:', err)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
