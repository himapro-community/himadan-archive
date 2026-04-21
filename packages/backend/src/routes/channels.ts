import type { FastifyPluginAsync } from 'fastify'

export const channelRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async () => {
    const channels = await fastify.prisma.channel.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { slackTs: 'desc' },
          take: 1,
          select: { slackTs: true },
        },
      },
    })

    return channels.map((c) => ({
      id: c.id,
      slackId: c.slackId,
      name: c.name,
      messageCount: c._count.messages,
      lastMessageAt: c.messages[0]?.slackTs ?? null,
    }))
  })
}
