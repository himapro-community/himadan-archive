import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { fetchUserProfile } from './fetch-channel.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

try {
  // userId が未設定で slackUserId を持つメッセージからユニークなユーザーIDを収集
  const rows = await prisma.message.findMany({
    where: {
      slackUserId: { not: null },
      userId: null,
    },
    select: { slackUserId: true },
    distinct: ['slackUserId'],
  })

  const uniqueSlackUserIds = rows
    .map((r) => r.slackUserId!)
    .filter((id) => !id.startsWith('B')) // Bot ID (B...) を除外

  console.log(`バックフィル対象ユーザー: ${uniqueSlackUserIds.length} 人\n`)

  let success = 0
  let failed = 0

  for (const slackUserId of uniqueSlackUserIds) {
    const profile = await fetchUserProfile(slackUserId)

    if (!profile) {
      console.warn(`  [skip] ${slackUserId}: プロフィール取得失敗`)
      failed++
      continue
    }

    // User を upsert
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

    // そのユーザーの全メッセージを一括で userId に紐付け
    const updated = await prisma.message.updateMany({
      where: { slackUserId, userId: null },
      data: { userId: user.id },
    })

    console.log(`  [ok] ${profile.displayName} (${slackUserId}) → ${updated.count} 件のメッセージを紐付け`)
    success++
  }

  console.log(`\n✓ 完了: 成功 ${success} 人 / スキップ ${failed} 人`)
} catch (err) {
  console.error('エラー:', err)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
