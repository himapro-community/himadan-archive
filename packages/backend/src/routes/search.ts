import type { FastifyPluginAsync } from 'fastify'

const SEARCH_LIMIT = 30

interface SearchQuery {
  q: string
  channelId?: string
  cursor?: string
  limit?: string
}

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: SearchQuery }>('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { q, channelId, cursor, limit } = request.query

    if (!q || q.trim().length < 2) {
      return reply.status(400).send({ error: '検索キーワードは2文字以上必要です' })
    }

    const take = Math.min(Number(limit ?? SEARCH_LIMIT), 100)

    const messages = await fastify.prisma.message.findMany({
      where: {
        text: { contains: q },
        ...(channelId ? { channelId } : {}),
        ...(cursor ? { slackTs: { gt: cursor } } : {}),
      },
      orderBy: { slackTs: 'asc' },
      take: take + 1,
      select: {
        id: true,
        slackTs: true,
        text: true,
        threadTs: true,
        replyCount: true,
        senderName: true,
        channelId: true,
        channel: { select: { name: true } },
        user: { select: { slackUserId: true, displayName: true, avatarUrl: true } },
        files: { select: { id: true, slackUrl: true, mimeType: true, name: true } },
      },
    })

    const hasNext = messages.length > take
    const items = hasNext ? messages.slice(0, take) : messages

    return {
      items,
      nextCursor: hasNext ? items[items.length - 1].slackTs : null,
      query: q,
    }
  })
}
