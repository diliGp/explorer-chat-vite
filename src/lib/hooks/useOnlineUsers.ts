'use client'

import { useEffect, useState } from 'react'
import { listenToAllPresence } from '@/lib/firebase/rtdb'
import { usersCol } from '@/lib/firebase/firestore'
import { getDocs, query, where, documentId } from 'firebase/firestore'
import { useAppStore } from '@/store'
import type { OnlineUser } from '@/types'

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const currentUser = useAppStore((s) => s.currentUser)
  const blockedUsers: string[] = currentUser?.blockedUsers ?? []

  useEffect(() => {
    let profileCache: Record<string, OnlineUser> = {}

    // Safety: if RTDB never responds, stop showing skeletons after 5s
    const fallbackTimer = setTimeout(() => setLoading(false), 5000)

    // 30s grace: keep a user visible briefly after going offline to avoid flicker
    const GRACE_MS = 30_000

    const unsubscribe = listenToAllPresence(async (presenceData) => {
      clearTimeout(fallbackTimer)

      const now = Date.now()
      const visibleUids = Object.keys(presenceData).filter((uid) => {
        const p = presenceData[uid]
        if (!p) return false
        return p.online || (now - (p.lastSeen ?? 0) < GRACE_MS)
      })

      // Fetch profiles not yet cached
      const uncached = visibleUids.filter((uid) => !profileCache[uid])
      if (uncached.length > 0) {
        const chunks = chunkArray(uncached, 10) // Firestore 'in' limit
        for (const chunk of chunks) {
          const q = query(usersCol(), where(documentId(), 'in', chunk))
          try {
            const snaps = await getDocs(q)
            snaps.forEach((snap) => {
              const data = snap.data()
              profileCache[snap.id] = {
                uid: snap.id,
                name: data.name,
                gender: data.gender,
                country: data.country,
                city: data.city,
                avatarUrl: data.avatarUrl,
                bio: data.bio,
                isOnline: true,
                lastSeen: presenceData[snap.id]?.lastSeen ?? Date.now(),
              }
            })
          } catch (e: any) {
            console.error('[useOnlineUsers] Firestore query failed:', e.message)
          }
        }
      }

      // Build list from cache — mark online/offline accurately, exclude blocked
      const users: OnlineUser[] = visibleUids
        .map((uid) => profileCache[uid])
        .filter(Boolean)
        .filter((u) => !blockedUsers.includes(u.uid))
        .map((u) => ({
          ...u,
          isOnline: presenceData[u.uid]?.online ?? false,
          lastSeen: presenceData[u.uid]?.lastSeen ?? u.lastSeen,
        }))

      setOnlineUsers(users)
      setLoading(false)
    })

    return () => {
      clearTimeout(fallbackTimer)
      unsubscribe()
    }
  }, [])

  return { onlineUsers, loading }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
