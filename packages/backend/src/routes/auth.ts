import crypto from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'

const SLACK_AUTHORIZE_URL = 'https://slack.com/openid/connect/authorize'
const SLACK_TOKEN_URL = 'https://slack.com/api/openid.connect.token'
const SCOPES = 'openid profile'
const STATE_COOKIE = 'oauth_state'
const TOKEN_COOKIE = 'token'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7日

interface SlackTokenResponse {
  ok: boolean
  id_token?: string
  error?: string
}

interface SlackIdTokenClaims {
  sub: string // Slack user ID
  name: string
  picture?: string
  'https://slack.com/team_id': string
  'https://slack.com/user_id': string
}

function decodeIdToken(idToken: string): SlackIdTokenClaims {
  const [, payload] = idToken.split('.')
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as SlackIdTokenClaims
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const redirectUri = `${process.env.API_URL ?? 'http://localhost:3001'}/api/auth/slack/callback`
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  // ---- Step 1: Slack OAuth へリダイレクト ----
  fastify.get('/slack', async (request, reply) => {
    const state = crypto.randomBytes(16).toString('hex')

    // CSRF 対策: state を短命 cookie に保存
    reply.setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10分
      path: '/',
    })

    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
    })

    return reply.redirect(`${SLACK_AUTHORIZE_URL}?${params}`)
  })

  // ---- Step 2: コールバック ----
  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/slack/callback',
    async (request, reply) => {
      const { code, state, error } = request.query

      if (error) {
        return reply.redirect(`${frontendUrl}/login?error=${error}`)
      }

      // state 検証
      const savedState = (request.cookies as Record<string, string>)[STATE_COOKIE]
      if (!state || state !== savedState) {
        return reply.redirect(`${frontendUrl}/login?error=invalid_state`)
      }
      reply.clearCookie(STATE_COOKIE, { path: '/' })

      // コードをトークンに交換
      const tokenRes = await fetch(SLACK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.SLACK_CLIENT_ID!,
          client_secret: process.env.SLACK_CLIENT_SECRET!,
          code: code!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      const tokenData = (await tokenRes.json()) as SlackTokenResponse

      if (!tokenData.ok || !tokenData.id_token) {
        return reply.redirect(`${frontendUrl}/login?error=token_exchange_failed`)
      }

      const claims = decodeIdToken(tokenData.id_token)
      const slackUserId = claims['https://slack.com/user_id'] || claims.sub
      const teamId = claims['https://slack.com/team_id']

      // team_id チェック: ひまプロ談話室のみ許可
      const isApproved = teamId === process.env.SLACK_TEAM_ID

      // User を upsert（ログイン = プロフィール最新化）
      const user = await fastify.prisma.user.upsert({
        where: { slackUserId },
        update: {
          displayName: claims.name,
          avatarUrl: claims.picture ?? null,
          isApproved,
        },
        create: {
          slackUserId,
          teamId,
          displayName: claims.name,
          realName: claims.name,
          avatarUrl: claims.picture ?? null,
          isApproved,
        },
      })

      if (!user.isApproved) {
        return reply.redirect(`${frontendUrl}/login?error=not_approved`)
      }

      // JWT を発行して cookie にセット
      const jwtToken = await reply.jwtSign({ userId: user.id })

      reply.setCookie(TOKEN_COOKIE, jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOKEN_MAX_AGE,
        path: '/',
      })

      return reply.redirect(frontendUrl)
    }
  )

  // ---- 現在のログインユーザーを返す ----
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request) => {
    const { userId } = request.user
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        slackUserId: true,
        displayName: true,
        avatarUrl: true,
        isApproved: true,
      },
    })
    return user
  })

  // ---- ログアウト ----
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie(TOKEN_COOKIE, { path: '/' })
    return { ok: true }
  })
}
