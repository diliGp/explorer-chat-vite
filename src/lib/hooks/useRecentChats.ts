import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { dmsByParticipant, usersCol } from '@/lib/firebase/firestore'
import { getDocs, query, where, documentId } from 'firebase/firestore'
import { useAppStore } from '@/store'
import type { DM, OnlineUser } from '@/types'

export interface RecentChat {
  dm: DM
  otherUser: OnlineUser
  unreadCount: number
}

export function useRecentChats(currentUid: string) {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([])
  const [loading, setLoading] = useState(true)
  const currentUser = useAppStore((s) => s.currentUser)
  const blockedUsers: string[] = currentUser?.blockedUsers ?? []

  useEffect(() => {
    if (!currentUid) return

    const profileCache: Record<string, OnlineUser> = {}

    const fetchProfiles = async (uids: string[]) => {
      const uncached = uids.filter((uid) => !profileCache[uid])
      if (uncached.length === 0) return

      const chunks: string[][] = []
      for (let i = 0; i < uncached.length; i += 10) {
        chunks.push(uncached.slice(i, i + 10))
      }
      for (const chunk of chunks) {
        try {
          const q = query(usersCol(), where(documentId(), 'in', chunk))
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
              isOnline: false,
              lastSeen: 0,
            }
          })
        } catch (e: any) {
          console.error('[useRecentChats] profile fetch failed:', e.message)
        }
      }
    }

    const unsub = onSnapshot(dmsByParticipant(currentUid), async (snap) => {
      const dms: DM[] = snap.docs.map((d) => ({ ...d.data(), id: d.id } as DM))

      // Collect all other participant uids
      const otherUids = dms
        .map((dm) => dm.participants.find((p) => p !== currentUid))
        .filter(Boolean) as string[]

      await fetchProfiles(otherUids)

      const chats: RecentChat[] = dms
        .filter((dm) => {
          const otherUid = dm.participants.find((p) => p !== currentUid)
          return otherUid && !blockedUsers.includes(otherUid)
        })
        .map((dm) => {
          const otherUid = dm.participants.find((p) => p !== currentUid) ?? ''
          const lastRead = dm.lastReadAt?.[currentUid] ?? 0
          const unreadCount =
            dm.lastSenderId !== currentUid && dm.lastMessageAt > lastRead ? 1 : 0

          return {
            dm,
            otherUser: profileCache[otherUid] ?? {
              uid: otherUid,
              name: dm.participantNames?.[otherUid] ?? 'User',
              gender: dm.participantGenders?.[otherUid] ?? 'other',
              country: dm.participantCountries?.[otherUid] ?? 'US',
              isOnline: false,
              lastSeen: 0,
            },
            unreadCount,
          }
        })

      setRecentChats(chats)
      setLoading(false)
    })

    return unsub
  }, [currentUid])

  return { recentChats, loading }
}
