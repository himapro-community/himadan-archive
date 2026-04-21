import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { MessageList } from '../components/message/MessageList'
import { ThreadDrawer } from '../components/thread/ThreadDrawer'
import { ActivityHeatmap } from '../components/heatmap/ActivityHeatmap'
import { channelColor } from '../utils/format'
import type { Channel, Message } from '../types'

interface Props {
  channels: Channel[]
}

export function ArchivePage({ channels }: Props) {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()

  const [messages, setMessages] = useState<Message[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  const currentChannel = channels.find((c) => c.id === channelId)

  const fetchMessages = useCallback(
    async (cursor?: string) => {
      if (!channelId || isLoading) return
      setIsLoading(true)
      try {
        const res = await api.messages.list(channelId, cursor)
        setMessages((prev) => (cursor ? [...prev, ...res.items] : res.items))
        setNextCursor(res.nextCursor)
      } finally {
        setIsLoading(false)
      }
    },
    [channelId]
  )

  useEffect(() => {
    if (!channelId && channels.length > 0) {
      navigate(`/channels/${channels[0].id}`, { replace: true })
      return
    }
    setMessages([])
    setNextCursor(null)
    setSelectedMessage(null)
    fetchMessages()
  }, [channelId, channels])

  return (
    <div className="flex-1 overflow-y-auto bg-surface-bright relative">
      <div className="max-w-3xl mx-auto py-6 px-6">
        {currentChannel && (
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-on-surface-variant">tag</span>
            <h2 className="text-title-lg font-bold text-on-surface">{currentChannel.name}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${channelColor(currentChannel.name)}`}>
              {currentChannel.messageCount.toLocaleString()}件
            </span>
          </div>
        )}

        <ActivityHeatmap channelId={channelId} />

        <MessageList
          messages={messages}
          onThreadOpen={setSelectedMessage}
          onLoadMore={() => nextCursor && fetchMessages(nextCursor)}
          hasMore={nextCursor !== null}
          isLoading={isLoading}
        />
      </div>

      <ThreadDrawer
        message={selectedMessage}
        channelId={channelId ?? ''}
        channelName={currentChannel?.name ?? ''}
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  )
}
