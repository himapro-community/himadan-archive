import { useEffect, useState } from 'react'
import { api } from '../api/client'

// Module-level cache so we only fetch once per session
let cache: Map<string, string> | null = null
let fetchPromise: Promise<Map<string, string>> | null = null

async function loadUsers(): Promise<Map<string, string>> {
  if (cache) return cache
  if (!fetchPromise) {
    fetchPromise = api.users.list().then((users) => {
      cache = new Map(users.map((u) => [u.slackUserId, u.displayName]))
      return cache
    })
  }
  return fetchPromise
}

export function useUserMap(): Map<string, string> {
  const [userMap, setUserMap] = useState<Map<string, string>>(cache ?? new Map())

  useEffect(() => {
    if (cache) return
    loadUsers().then(setUserMap)
  }, [])

  return userMap
}
