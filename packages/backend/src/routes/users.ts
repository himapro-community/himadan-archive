import type { FastifyPluginAsync } from 'fastify'

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async () => {
    return fastify.prisma.user.findMany({
      select: { slackUserId: true, displayName: true },
    })
  })
}
