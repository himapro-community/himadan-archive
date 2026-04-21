import { WebClient } from '@slack/web-api'

let _client: WebClient | null = null

export function getSlackClient(): WebClient {
  if (!_client) {
    const token = process.env.SLACK_BOT_TOKEN
    if (!token) throw new Error('SLACK_BOT_TOKEN が設定されていません')
    _client = new WebClient(token)
  }
  return _client
}

// Slack API Tier 3 (50 req/min) を超えないようにするためのスリープ
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
