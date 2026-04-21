import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import Fastify from 'fastify'
import { jwtPlugin } from './plugins/jwt.js'
import { corsPlugin } from './plugins/cors.js'
import { prismaPlugin } from './plugins/prisma.js'
import { authRoutes } from './routes/auth.js'
import { channelRoutes } from './routes/channels.js'
import { messageRoutes } from './routes/messages.js'
import { searchRoutes } from './routes/search.js'
import { heatmapRoutes } from './routes/heatmap.js'
import { userRoutes } from './routes/users.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../../.env') })
config({ path: path.resolve(__dirname, '../.env') })

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

// プラグイン登録順: cors → cookie/jwt → prisma
await server.register(corsPlugin)
await server.register(jwtPlugin)
await server.register(prismaPlugin)

// ルート登録
await server.register(authRoutes, { prefix: '/api/auth' })
await server.register(channelRoutes, { prefix: '/api/channels' })
await server.register(messageRoutes, { prefix: '/api/messages' })
await server.register(searchRoutes, { prefix: '/api/search' })
await server.register(heatmapRoutes, { prefix: '/api/heatmap' })
await server.register(userRoutes, { prefix: '/api/users' })

server.get('/api/health', async () => ({ status: 'ok' }))

const PORT = Number(process.env.PORT ?? 3001)

try {
  await server.listen({ port: PORT, host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '::' })
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
