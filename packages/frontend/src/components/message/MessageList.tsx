import { useEffect, useRef, useCallback } from 'react'
import { formatDateLabel, isSameDay } from '../../utils/format'
import { MessageItem } from './MessageItem'
import type { Message } from '../../types'

interface Props {
  messages: Message[]
  onThreadOpen: (message: Message) => void
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center my-6">
      <div className="flex-1 h-px bg-outline-variant" />
      <span className="mx-4 text-label-lg text-on-surface-variant whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-outline-variant" />
    </div>
  )
}

export function MessageList({ messages, onThreadOpen, onLoadMore, hasMore, isLoading }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        onLoadMore()
      }
    },
    [hasMore, isLoading, onLoadMore]
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl mb-3">forum</span>
        <p className="text-label-lg">メッセージがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, i) => {
        const prev = messages[i - 1]
        const showDate = !prev || !isSameDay(prev.slackTs, msg.slackTs)
        return (
          <div key={msg.id}>
            {showDate && <DateDivider label={formatDateLabel(msg.slackTs)} />}
            <MessageItem message={msg} onThreadOpen={onThreadOpen} />
          </div>
        )
      })}

      {/* 無限スクロール用センチネル */}
      <div ref={sentinelRef} className="py-2">
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
