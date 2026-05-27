import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, OnlineUser } from '@/types'

interface AppState {
  // Auth
  currentUser: UserProfile | null
  setCurrentUser: (user: UserProfile | null) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Online users
  onlineUsers: OnlineUser[]
  setOnlineUsers: (users: OnlineUser[]) => void

  // Active DM
  activeDmId: string | null
  setActiveDmId: (id: string | null) => void

  // Blocked users (local cache)
  blockedUsers: string[]
  addBlockedUser: (uid: string) => void
  removeBlockedUser: (uid: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      onlineUsers: [],
      setOnlineUsers: (users) => set({ onlineUsers: users }),

      activeDmId: null,
      setActiveDmId: (id) => set({ activeDmId: id }),

      blockedUsers: [],
      addBlockedUser: (uid) =>
        set((s) => ({ blockedUsers: [...new Set([...s.blockedUsers, uid])] })),
      removeBlockedUser: (uid) =>
        set((s) => ({ blockedUsers: s.blockedUsers.filter((u) => u !== uid) })),
    }),
    {
      name: 'chatapp-store',
      partialize: (s) => ({ theme: s.theme, blockedUsers: s.blockedUsers }),
    }
  )
)
