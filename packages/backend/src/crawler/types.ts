export interface SlackFile {
  id: string
  url_private?: string
  mimetype?: string
  name?: string
}

export interface SlackMessage {
  ts: string
  user?: string
  bot_id?: string
  username?: string
  bot_profile?: { name?: string }
  text: string
  thread_ts?: string
  reply_count?: number
  files?: SlackFile[]
}

export interface SlackUserProfile {
  slackUserId: string
  teamId: string
  displayName: string
  realName: string
  avatarUrl?: string
}
