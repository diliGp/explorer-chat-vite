import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, OnlineUser } from '@/types'

interface AppState {
  // Auth
  currentUser: UserProfile | null
  setCurrentUser: (user: UserProfile | null) => void
  authReady: boolean
  setAuthReady: (ready: boolean) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Online users
  onlineUsers: OnlineUser[]
  setOnlineUsers: (users: OnlineUser[]) => void

  // Active DM
  activeDmId: string | null
  setActiveDmId: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      authReady: false,
      setAuthReady: (ready) => set({ authReady: ready }),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      onlineUsers: [],
      setOnlineUsers: (users) => set({ onlineUsers: users }),

      activeDmId: null,
      setActiveDmId: (id) => set({ activeDmId: id }),
    }),
    {
      name: 'chatapp-store',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
)
