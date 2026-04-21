import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import Fastify from 'fastify'
import { authRoutes } from './routes/auth.js'
import { channelRoutes } from './routes/channels.js'
import { messageRoutes } from './routes/messages.js'
import { searchRoutes } from './routes/search.js'
import { heatmapRoutes } from './routes/heatmap.js'
import { corsPlugin } from './plugins/cors.js'
import { prismaPlugin } from './plugins/prisma.js'

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

await server.register(corsPlugin)
await server.register(prismaPlugin)

await server.register(authRoutes, { prefix: '/api/auth' })
await server.register(channelRoutes, { prefix: '/api/channels' })
await server.register(messageRoutes, { prefix: '/api/messages' })
await server.register(searchRoutes, { prefix: '/api/search' })
await server.register(heatmapRoutes, { prefix: '/api/heatmap' })

server.get('/api/health', async () => ({ status: 'ok' }))

const PORT = Number(process.env.PORT ?? 3001)

try {
  await server.listen({ port: PORT, host: '0.0.0.0' })
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
