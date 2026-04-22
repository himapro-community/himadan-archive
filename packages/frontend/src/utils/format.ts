export function formatRelativeTime(slackTs: string): string {
  const date = new Date(Number(slackTs) * 1000)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  if (hours < 24) return `${hours}時間前`
  if (days < 7) return `${days}日前`

  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
}

export function formatTime(slackTs: string): string {
  const date = new Date(Number(slackTs) * 1000)
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateLabel(slackTs: string): string {
  const date = new Date(Number(slackTs) * 1000)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

export function isSameDay(ts1: string, ts2: string): boolean {
  const d1 = new Date(Number(ts1) * 1000)
  const d2 = new Date(Number(ts2) * 1000)
  return d1.toDateString() === d2.toDateString()
}

export function channelColor(name: string): string {
  if (name.startsWith('social-')) return 'bg-green-100 text-green-800'
  if (name.startsWith('ask-')) return 'bg-orange-100 text-orange-800'
  if (name === 'general') return 'bg-blue-100 text-blue-800'
  return 'bg-surface-container text-on-surface-variant'
}

import { get as getEmoji } from 'node-emoji'

function convertEmoji(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/g, (match, name) => {
    const emoji = getEmoji(name)
    return emoji ?? match
  })
}

// Slack mrkdwn のメンション・特殊記法を解決
export function resolveSlackText(text: string, userMap: Map<string, string>): string {
  return convertEmoji(text)
    // <@USERID> or <@USERID|label>
    .replace(/<@([A-Z0-9]+)(?:\|([^>]+))?>/g, (_, uid, label) => {
      const name = label || userMap.get(uid) || uid
      return `@${name}`
    })
    // <#CHANNELID|channelname>
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    // <!here>, <!channel>, <!everyone>
    .replace(/<!here>/g, '@here')
    .replace(/<!channel>/g, '@channel')
    .replace(/<!everyone>/g, '@everyone')
    // <URL|text> → text
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
    // <URL> → URL
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
}

// Slack mrkdwn のインライン書式を HTML に変換（コードブロック除く）
export function formatSlackMarkdown(text: string): string {
  return (
    text
      // HTML エスケープ（XSS防止）
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // インラインコード（他の変換より先に処理）
      .replace(/`([^`\n]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 text-slate-800 rounded text-[0.85em] font-mono">$1</code>')
      // 太字
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      // 取り消し線
      .replace(/~([^~\n]+)~/g, '<del>$1</del>')
      // 引用
      .replace(/^&gt; ?(.*)$/gm, '<span class="border-l-4 border-slate-300 pl-2 text-slate-500 block">$1</span>')
  )
}

// プレーンテキスト中のURLをクリッカブルなリンクに変換
export function linkifyText(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800 break-all">$1</a>'
  )
}

// ```コードブロック``` をパース
export function parseMessageText(text: string): { type: 'text' | 'code'; content: string }[] {
  const parts: { type: 'text' | 'code'; content: string }[] = []
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', content: match[1].trim() })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}
