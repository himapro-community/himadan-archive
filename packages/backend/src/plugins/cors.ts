import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyPluginAsync } from 'fastify'

const corsPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })
})

export { corsPlugin }
