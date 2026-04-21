FROM node:20-alpine AS base
RUN npm install -g pnpm

# deps
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile --filter backend

# build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY tsconfig.base.json ./
COPY packages/backend ./packages/backend
WORKDIR /app/packages/backend
RUN pnpm exec prisma generate
RUN pnpm build

# runner
FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile --filter backend --prod

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/node_modules/.prisma ./packages/backend/node_modules/.prisma
COPY packages/backend/prisma ./packages/backend/prisma

WORKDIR /app/packages/backend
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]
