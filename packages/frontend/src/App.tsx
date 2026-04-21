import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { api } from './api/client'
import { ArchivePage } from './pages/ArchivePage'
import { SearchPage } from './pages/SearchPage'
import { LoginPage } from './pages/LoginPage'
import { channelColor } from './utils/format'
import type { Channel, CurrentUser } from './types'

function Sidebar({ channels, user }: { channels: Channel[]; user: CurrentUser | null }) {
  const handleLogout = async () => {
    await api.auth.logout()
    window.location.href = '/login'
  }

  return (
    <aside className="hidden md:flex flex-col h-full w-64 bg-slate-50 border-r border-slate-200 flex-shrink-0">
      <div className="px-4 py-4 mb-1">
        <h2 className="text-xl font-black text-blue-900 tracking-tight">ひまプロアーカイブ</h2>
        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">ひまプロ談話室</p>
      </div>

      <nav className="px-2 space-y-0.5">
        <NavLink
          to="/search"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-colors ${
              isActive
                ? 'bg-blue-100/50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`
          }
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
          検索
        </NavLink>
      </nav>

      {/* チャンネル一覧 */}
      <div className="px-4 mt-4 mb-1">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">チャンネル</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {channels.map((ch) => (
          <NavLink
            key={ch.id}
            to={`/channels/${ch.id}`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                isActive
                  ? 'bg-blue-100/50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`
            }
          >
            <span className="text-on-surface-variant">#</span>
            <span className="flex-1 truncate">{ch.name}</span>
            {ch.messageCount > 0 && (
              <span className="text-[10px] text-on-surface-variant">{ch.messageCount}</span>
            )}
          </NavLink>
        ))}
      </div>

      {/* ユーザー */}
      <div className="border-t border-slate-200 px-3 py-3 flex items-center gap-2">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
        )}
        <span className="text-xs font-medium text-on-surface flex-1 truncate">
          {user?.displayName ?? ''}
        </span>
        <button
          onClick={handleLogout}
          title="ログアウト"
          className="p-1 hover:bg-slate-200 rounded transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">logout</span>
        </button>
      </div>
    </aside>
  )
}

function TopNav({ channels }: { channels: Channel[] }) {
  return (
    <header className="sticky top-0 z-30 flex justify-between items-center w-full px-4 h-12 bg-white border-b border-slate-200">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-black text-blue-900">himadan-archive</h1>
      </div>
    </header>
  )
}

function AppLayout({ channels, user }: { channels: Channel[]; user: CurrentUser | null }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background font-sans">
      <TopNav channels={channels} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar channels={channels} user={user} />
        <Routes>
          <Route path="/channels/:channelId" element={<ArchivePage channels={channels} />} />
          <Route path="/channels" element={<Navigate to={channels[0] ? `/channels/${channels[0].id}` : '/search'} replace />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/channels" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined)
  const [channels, setChannels] = useState<Channel[]>([])

  useEffect(() => {
    api.auth
      .me()
      .then((u) => {
        setUser(u)
        return api.channels.list()
      })
      .then(setChannels)
      .catch(() => setUser(null))
  }, [])

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route
          path="/*"
          element={user ? <AppLayout channels={channels} user={user} /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}
