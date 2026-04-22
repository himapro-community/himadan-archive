import crypto from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'

const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize'
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access'
const SLACK_USER_INFO_URL = 'https://slack.com/api/openid.connect.userInfo'
const USER_SCOPES = 'openid,profile'
const STATE_COOKIE = 'oauth_state'
const TOKEN_COOKIE = 'token'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7日

interface SlackOAuthV2Response {
  ok: boolean
  authed_user?: {
    id: string
    access_token: string
  }
  error?: string
}

interface SlackUserInfo {
  ok: boolean
  sub: string
  name: string
  picture?: string
  'https://slack.com/team_id': string
  'https://slack.com/user_id': string
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const redirectUri = `${process.env.API_URL ?? 'http://localhost:3001'}/api/auth/slack/callback`
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  // ---- Step 1: Slack OAuth へリダイレクト ----
  fastify.get('/slack', async (request, reply) => {
    const state = crypto.randomBytes(16).toString('hex')

    // CSRF 対策: state を短命 cookie に保存
    const isProd = process.env.NODE_ENV === 'production'
    reply.setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      user_scope: USER_SCOPES,
      state,
      team: process.env.SLACK_TEAM_ID!,
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

      const tokenData = (await tokenRes.json()) as SlackOAuthV2Response

      if (!tokenData.ok || !tokenData.authed_user?.access_token) {
        return reply.redirect(`${frontendUrl}/login?error=token_exchange_failed`)
      }

      const userInfoRes = await fetch(SLACK_USER_INFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.authed_user.access_token}` },
      })
      const userInfo = (await userInfoRes.json()) as SlackUserInfo

      if (!userInfo.ok) {
        return reply.redirect(`${frontendUrl}/login?error=userinfo_failed`)
      }

      const slackUserId = userInfo['https://slack.com/user_id'] || userInfo.sub
      const teamId = userInfo['https://slack.com/team_id']

      // team_id チェック: ひまプロ談話室のみ許可
      const isApproved = teamId === process.env.SLACK_TEAM_ID

      // User を upsert（ログイン = プロフィール最新化）
      const user = await fastify.prisma.user.upsert({
        where: { slackUserId },
        update: {
          displayName: userInfo.name,
          avatarUrl: userInfo.picture ?? null,
          isApproved,
        },
        create: {
          slackUserId,
          teamId,
          displayName: userInfo.name,
          realName: userInfo.name,
          avatarUrl: userInfo.picture ?? null,
          isApproved,
        },
      })

      if (!user.isApproved) {
        return reply.redirect(`${frontendUrl}/login?error=not_approved`)
      }

      // JWT を発行して cookie にセット
      const jwtToken = await reply.jwtSign({ userId: user.id })

      const isProd = process.env.NODE_ENV === 'production'
      reply.setCookie(TOKEN_COOKIE, jwtToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
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
