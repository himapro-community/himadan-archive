import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { MessageItem } from '../message/MessageItem'
import type { Message, ThreadResponse } from '../../types'

interface Props {
  message: Message | null
  channelId: string
  channelName: string
  onClose: () => void
}

export function ThreadDrawer({ message, channelId, channelName, onClose }: Props) {
  const [thread, setThread] = useState<ThreadResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!message) return
    setIsLoading(true)
    api.messages
      .thread(channelId, message.slackTs)
      .then(setThread)
      .finally(() => setIsLoading(false))
  }, [message?.slackTs, channelId])

  const isOpen = message !== null

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-40"
          onClick={onClose}
        />
      )}

      {/* ドロワー */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white sm:border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200 bg-surface-bright/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-title-md font-bold text-on-surface">スレッドの詳細</h3>
            <span className="text-xs text-on-surface-variant px-1.5 py-0.5 bg-surface-container rounded">
              #{channelName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-outline">close</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : thread ? (
          <div className="flex-1 overflow-y-auto">
            {/* 親メッセージ */}
            <div className="p-4 border-b border-slate-100 bg-surface-container-low/30">
              <MessageItem message={thread.parent} />
            </div>

            {/* 返信ヘッダー */}
            <div className="px-4 py-2 border-b border-slate-100 bg-surface-container-lowest sticky top-0 z-10">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                {thread.items.length} 件の返信
              </span>
            </div>

            {/* 返信一覧 */}
            <div className="p-4 space-y-6">
              {thread.items.map((reply) => (
                <MessageItem key={reply.id} message={reply} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
