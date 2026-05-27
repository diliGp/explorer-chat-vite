'use client'

import { useEffect, useState } from 'react'
import { listenToAllPresence } from '@/lib/firebase/rtdb'
import { usersCol } from '@/lib/firebase/firestore'
import { getDocs, query, where } from 'firebase/firestore'
import type { OnlineUser } from '@/types'

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileCache: Record<string, OnlineUser> = {}

    const unsubscribe = listenToAllPresence(async (presenceData) => {
      const onlineUids = Object.keys(presenceData).filter(
        (uid) => presenceData[uid]?.online
      )

      // Fetch profiles not yet cached
      const uncached = onlineUids.filter((uid) => !profileCache[uid])
      if (uncached.length > 0) {
        const chunks = chunkArray(uncached, 10) // Firestore 'in' limit
        for (const chunk of chunks) {
          const q = query(usersCol(), where('__name__', 'in', chunk))
          const snaps = await getDocs(q)
          snaps.forEach((snap) => {
            const data = snap.data()
            profileCache[snap.id] = {
              uid: snap.id,
              name: data.name,
              gender: data.gender,
              country: data.country,
              city: data.city,
              isOnline: true,
              lastSeen: presenceData[snap.id]?.lastSeen ?? Date.now(),
            }
          })
        }
      }

      // Build online list from cache
      const users: OnlineUser[] = onlineUids
        .map((uid) => profileCache[uid])
        .filter(Boolean)
        .map((u) => ({
          ...u,
          isOnline: presenceData[u.uid]?.online ?? false,
          lastSeen: presenceData[u.uid]?.lastSeen ?? u.lastSeen,
        }))

      setOnlineUsers(users)
      setLoading(false)
    })

    return unsubscribe
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
