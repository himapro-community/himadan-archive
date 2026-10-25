FROM node:22-alpine AS base
# pnpm は版を固定する。無指定だと最新が入り、pnpm 11 は Prisma の準備スクリプトを止めて
# ERR_PNPM_IGNORED_BUILDS で組み立てごと落とす（2026-10-24 に手元の組み立てで発覚）。
# lockfileVersion 9.0 は pnpm 10 で作ったもの
RUN npm install -g pnpm@10

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
FROM node:22-alpine AS runner
RUN npm install -g pnpm@10
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile --filter backend --prod

# prisma generate を本番deps上で実行してクライアントを生成
COPY packages/backend/prisma ./packages/backend/prisma
RUN cd packages/backend && pnpm exec prisma generate

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

WORKDIR /app/packages/backend
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]
