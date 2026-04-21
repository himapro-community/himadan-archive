import type {
  Channel, MessagesResponse, ThreadResponse,
  SearchResponse, HeatmapEntry, CurrentUser,
} from '../types'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' })
  if (res.status === 401) {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  auth: {
    me: () => get<CurrentUser>('/auth/me'),
    logout: () => fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' }),
  },
  channels: {
    list: () => get<Channel[]>('/channels'),
  },
  messages: {
    list: (channelId: string, cursor?: string) =>
      get<MessagesResponse>(`/messages/channels/${channelId}${cursor ? `?cursor=${cursor}` : ''}`),
    thread: (channelId: string, ts: string, cursor?: string) =>
      get<ThreadResponse>(`/messages/thread/${channelId}/${ts}${cursor ? `?cursor=${cursor}` : ''}`),
  },
  search: {
    query: (q: string, channelId?: string, cursor?: string) => {
      const params = new URLSearchParams({ q })
      if (channelId) params.set('channelId', channelId)
      if (cursor) params.set('cursor', cursor)
      return get<SearchResponse>(`/search?${params}`)
    },
  },
  heatmap: {
    get: (channelId?: string) =>
      get<HeatmapEntry[]>(`/heatmap${channelId ? `?channelId=${channelId}` : ''}`),
  },
  users: {
    list: () => get<{ slackUserId: string; displayName: string }[]>('/users'),
  },
}
