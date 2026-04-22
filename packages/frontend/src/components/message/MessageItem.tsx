import { formatRelativeTime, channelColor, parseMessageText, resolveSlackText, formatSlackMarkdown, linkifyText } from '../../utils/format'
import { useUserMap } from '../../hooks/useUserMap'
import type { Message, SearchResult } from '../../types'

interface Props {
  message: Message
  onThreadOpen?: (message: Message) => void
  channelName?: string
  highlightQuery?: string
}

function highlightText(text: string, query: string): string {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

function MessageText({ text, query }: { text: string; query?: string }) {
  const parts = parseMessageText(text)
  return (
    <div className="text-body-md mt-1 space-y-1">
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <pre key={i} className="mt-2 p-3 bg-slate-900 text-slate-300 rounded-md font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
            <code>{part.content}</code>
          </pre>
        ) : (
          <p
            key={i}
            className="whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{
              __html: query
                ? highlightText(linkifyText(formatSlackMarkdown(part.content)), query)
                : linkifyText(formatSlackMarkdown(part.content)),
            }}
          />
        )
      )}
    </div>
  )
}

export function MessageItem({ message, onThreadOpen, channelName, highlightQuery }: Props) {
  const userMap = useUserMap()
  const resolvedText = resolveSlackText(message.text, userMap)
  const hasThread = message.replyCount > 0
  const avatarUrl = message.user?.avatarUrl
  const isBot = !message.user && !!message.senderName
  const displayName = message.user?.displayName ?? message.senderName ?? '不明なユーザー'

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-md" />
        ) : isBot ? (
          <div className="w-9 h-9 rounded-md bg-orange-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-500 text-[20px]">smart_toy</span>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-on-surface text-sm">{displayName}</span>
          <span className="text-label-sm text-outline">{formatRelativeTime(message.slackTs)}</span>
          {channelName && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${channelColor(channelName)}`}>
              #{channelName}
            </span>
          )}
        </div>

        <MessageText text={resolvedText} query={highlightQuery} />

        {/* Files */}
        {message.files.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.files.map((file) => (
              <a
                key={file.id}
                href={file.slackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg text-xs text-primary hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                {file.name ?? 'ファイル'}
              </a>
            ))}
          </div>
        )}

        {/* Thread button */}
        {hasThread && onThreadOpen && (
          <button
            onClick={() => onThreadOpen(message)}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">forum</span>
            {message.replyCount}件の返信を見る
          </button>
        )}
      </div>
    </div>
  )
}
