'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOnlineUsers } from '@/lib/hooks/useOnlineUsers'
import { useAppStore } from '@/store'
import { UserCard } from '@/components/users/UserCard'
import { ThemeToggle } from './ThemeToggle'
import { AdSlot } from './AdSlot'
import { getDmId } from '@/lib/firebase/firestore'
import { setDoc, serverTimestamp } from 'firebase/firestore'
import { dmDoc } from '@/lib/firebase/firestore'
import { db } from '@/lib/firebase/client'
import { doc, getDoc } from 'firebase/firestore'

export function Sidebar() {
  const { onlineUsers, loading } = useOnlineUsers()
  const { currentUser } = useAppStore()
  const router = useRouter()

  const handleStartChat = async (targetUid: string) => {
    if (!currentUser) return

    const dmId = getDmId(currentUser.uid, targetUid)
    const dmRef = doc(db, 'dms', dmId)
    const existing = await getDoc(dmRef)

    if (!existing.exists()) {
      const target = onlineUsers.find((u) => u.uid === targetUid)
      await setDoc(dmRef, {
        participants: [currentUser.uid, targetUid],
        participantNames: {
          [currentUser.uid]: currentUser.name,
          [targetUid]: target?.name ?? 'User',
        },
        participantGenders: {
          [currentUser.uid]: currentUser.gender ?? 'other',
          [targetUid]: target?.gender ?? 'other',
        },
        participantCountries: {
          [currentUser.uid]: currentUser.country ?? 'US',
          [targetUid]: target?.country ?? 'US',
        },
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        lastMessagePreview: '',
        unreadCount: 0,
        lastSenderId: '',
        consecutiveSenderCount: 0,
      })
    }

    router.push(`/dm/${dmId}`)
  }

  return (
    <aside
      className="w-72 flex flex-col border-r border-[var(--border)] bg-[var(--bg-primary)] h-full"
      aria-label="Online users"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-lg">
          <span className="w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white text-sm">
            C
          </span>
          ChatApp
        </Link>
        <ThemeToggle />
      </div>

      {/* Online count */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" aria-hidden="true" />
          {loading ? '...' : `${onlineUsers.length} Online`}
        </p>
      </div>

      {/* Ad slot — leaderboard above users */}
      <div className="flex justify-center px-4 py-3 border-b border-[var(--border)]">
        <AdSlot id="sidebar-top" width={240} height={60} />
      </div>

      {/* Users list */}
      <div
        className="flex-1 overflow-y-auto px-2 py-2"
        role="list"
        aria-label="Online users list"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {loading ? (
          <div className="flex flex-col gap-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-[var(--bg-surface)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : onlineUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-3">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[var(--text-muted)]">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">No one online yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Be the first to start chatting!</p>
          </div>
        ) : (
          <div role="list">
            {onlineUsers.map((user) => (
              <div key={user.uid} role="listitem">
                <UserCard
                  user={user}
                  onStartChat={handleStartChat}
                  currentUid={currentUser?.uid}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ad slot — below users */}
      <div className="flex justify-center px-4 py-3 border-t border-[var(--border)]">
        <AdSlot id="sidebar-bottom" width={240} height={250} />
      </div>

      {/* Footer links */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          <Link href="/privacy-policy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link>
          {currentUser && !currentUser.isPermanent && (
            <Link href="/register" className="text-[var(--accent)] font-medium hover:underline">
              Save Account
            </Link>
          )}
        </div>
        {currentUser && (
          <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
            You: <span className="font-medium text-[var(--text-primary)]">{currentUser.name}</span>
          </p>
        )}
      </div>
    </aside>
  )
}
