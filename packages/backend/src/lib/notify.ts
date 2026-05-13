import { WebClient } from '@slack/web-api'

const DEFAULT_CHANNEL = 'C0B36B3A6D7'

let _client: WebClient | null = null

function getClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return null
  if (!_client) _client = new WebClient(token)
  return _client
}

function formatError(err: unknown): string {
  const parts: string[] = []
  if (err instanceof Error) {
    parts.push(err.stack ?? `${err.name}: ${err.message}`)
    // Slack の WebAPIPlatformError などは err.data に詳細が入る
    const data = (err as { data?: unknown }).data
    if (data) {
      try {
        parts.push(`data: ${JSON.stringify(data)}`)
      } catch {
        // ignore
      }
    }
  } else {
    try {
      parts.push(JSON.stringify(err, null, 2))
    } catch {
      parts.push(String(err))
    }
  }
  return parts.join('\n')
}

export async function notifyError(context: string, err: unknown): Promise<void> {
  const client = getClient()
  if (!client) return

  const channel = process.env.SLACK_ALERT_CHANNEL || DEFAULT_CHANNEL
  const env = process.env.NODE_ENV ?? 'development'
  const detail = formatError(err)
  const truncated = detail.length > 2800 ? `${detail.slice(0, 2800)}\n... (truncated)` : detail

  try {
    await client.chat.postMessage({
      channel,
      text: `:rotating_light: himadan-archive error [${env}] — ${context}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:rotating_light: *himadan-archive error* \`[${env}]\`\n*Context:* ${context}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + truncated + '```',
          },
        },
      ],
    })
  } catch (postErr) {
    console.error('[notify] Slack 通知の送信に失敗:', postErr)
  }
}
