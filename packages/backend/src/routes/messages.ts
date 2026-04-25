import type { FastifyPluginAsync } from 'fastify'

const MESSAGE_LIMIT = 50

const messageSelect = {
  id: true,
  slackTs: true,
  text: true,
  threadTs: true,
  replyCount: true,
  senderName: true,
  user: { select: { slackUserId: true, displayName: true, avatarUrl: true } },
  files: { select: { id: true, slackUrl: true, mimeType: true, name: true } },
} as const

interface MessagesQuery {
  cursor?: string
  limit?: string
  order?: 'asc' | 'desc'
}

interface ThreadParams {
  channelId: string
  ts: string
}

export const messageRoutes: FastifyPluginAsync = async (fastify) => {
  // チャンネルのメッセージ一覧（カーソルページネーション・昇順）
  fastify.get<{ Params: { channelId: string }; Querystring: MessagesQuery }>(
    '/channels/:channelId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId } = request.params
      const { cursor, limit, order = 'asc' } = request.query
      const take = Math.min(Number(limit ?? MESSAGE_LIMIT), 200)
      const dir = order === 'desc' ? 'desc' : 'asc'

      const channel = await fastify.prisma.channel.findUnique({ where: { id: channelId } })
      if (!channel) return reply.status(404).send({ error: 'Channel not found' })

      const messages = await fastify.prisma.message.findMany({
        where: {
          channelId,
          threadTs: null,
          ...(cursor ? { slackTs: { [dir === 'asc' ? 'gt' : 'lt']: cursor } } : {}),
        },
        orderBy: { slackTs: dir },
        take: take + 1,
        select: messageSelect,
      })

      const hasNext = messages.length > take
      const items = hasNext ? messages.slice(0, take) : messages

      return {
        items,
        nextCursor: hasNext ? items[items.length - 1].slackTs : null,
      }
    }
  )

  // スレッド返信取得
  fastify.get<{ Params: ThreadParams; Querystring: MessagesQuery }>(
    '/thread/:channelId/:ts',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { channelId, ts } = request.params
      const { cursor, limit } = request.query
      const take = Math.min(Number(limit ?? MESSAGE_LIMIT), 200)

      const parent = await fastify.prisma.message.findUnique({
        where: { channelId_slackTs: { channelId, slackTs: ts } },
        select: { ...messageSelect, replyCount: true },
      })
      if (!parent) return reply.status(404).send({ error: 'Message not found' })

      const replies = await fastify.prisma.message.findMany({
        where: {
          channelId,
          threadTs: ts,
          ...(cursor ? { slackTs: { gt: cursor } } : {}),
        },
        orderBy: { slackTs: 'asc' },
        take: take + 1,
        select: messageSelect,
      })

      const hasNext = replies.length > take
      const items = hasNext ? replies.slice(0, take) : replies

      return {
        parent,
        items,
        nextCursor: hasNext ? items[items.length - 1].slackTs : null,
      }
    }
  )
}
