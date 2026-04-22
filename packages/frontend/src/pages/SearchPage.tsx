import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { MessageItem } from '../components/message/MessageItem'
import type { SearchResult } from '../types'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setIsLoading(true)
    setSearched(true)
    try {
      const res = await api.search.query(q.trim())
      setResults(res.items)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  return (
    <div className="flex-1 overflow-y-auto bg-surface-bright">
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
        {/* 検索バー */}
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          {isLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </span>
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワードを入力..."
            className="w-full pl-10 pr-10 py-2.5 bg-surface-container rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 結果数 */}
        {searched && !isLoading && (
          <p className="text-label-lg text-on-surface-variant mb-4">
            {results.length > 0
              ? `${results.length}件の検索結果 "${query}"`
              : `"${query}" の検索結果はありませんでした`}
          </p>
        )}

        {/* 結果リスト */}
        {!isLoading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="p-4 bg-white rounded-xl border border-outline-variant hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/channels/${result.channelId}`)}
              >
                <MessageItem
                  message={result}
                  channelName={result.channel.name}
                  highlightQuery={query}
                />
              </div>
            ))}
          </div>
        )}

        {/* 空状態 */}
        {!isLoading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
            <p className="text-label-lg">一致するメッセージが見つかりませんでした</p>
          </div>
        )}

        {/* 初期状態 */}
        {!searched && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4">manage_search</span>
            <p className="text-label-lg">2文字以上入力すると検索します</p>
          </div>
        )}
      </div>
    </div>
  )
}
