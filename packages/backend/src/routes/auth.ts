import type { FastifyPluginAsync } from 'fastify'

// Slack OAuth の実装は Slack Bot Token 取得後に追加
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me', async (request, reply) => {
    // TODO: セッションからログインユーザーを返す
    return reply.status(501).send({ error: 'Not implemented' })
  })

  fastify.get('/logout', async (request, reply) => {
    // TODO: セッション破棄
    return reply.status(501).send({ error: 'Not implemented' })
  })
}
