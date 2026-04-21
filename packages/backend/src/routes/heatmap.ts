import type { FastifyPluginAsync } from 'fastify'

interface HeatmapQuery {
  channelId?: string
  months?: string // 取得する月数（デフォルト12）
}

export const heatmapRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: HeatmapQuery }>('/', { onRequest: [fastify.authenticate] }, async (request) => {
    const { channelId, months = '12' } = request.query
    const since = Math.floor(Date.now() / 1000) - Number(months) * 30 * 24 * 60 * 60

    // slackTs はUnixタイムスタンプ文字列なので数値比較できる
    const messages = await fastify.prisma.message.findMany({
      where: {
        ...(channelId ? { channelId } : {}),
        slackTs: { gte: String(since) },
      },
      select: { slackTs: true },
    })

    // slackTs → YYYY-MM-DD に変換して集計
    const countByDate = new Map<string, number>()
    for (const { slackTs } of messages) {
      const date = new Date(Number(slackTs) * 1000).toISOString().slice(0, 10)
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1)
    }

    const result = Array.from(countByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return result
  })
}
