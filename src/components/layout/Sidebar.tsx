import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useOnlineUsers } from '@/lib/hooks/useOnlineUsers'
import { useRecentChats } from '@/lib/hooks/useRecentChats'
import { useAppStore } from '@/store'
import { UserCard } from '@/components/users/UserCard'
import { UserAvatar } from '@/components/users/UserAvatar'
import { EditProfileSheet } from '@/components/users/EditProfileSheet'
import { ThemeToggle } from './ThemeToggle'
import { AdSlot } from './AdSlot'
import { getDmId } from '@/lib/firebase/firestore'
import { setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { doc } from 'firebase/firestore'
import { handleLogout } from '@/lib/hooks/useAuth'

export function Sidebar() {
  const { onlineUsers, loading } = useOnlineUsers()
  const { currentUser, setCurrentUser } = useAppStore()
  const { recentChats } = useRecentChats(currentUser?.uid ?? '')
  const navigate = useNavigate()
  const [showEditProfile, setShowEditProfile] = useState(false)

  const handleSignOut = async () => {
    if (!currentUser) return
    await handleLogout(!currentUser.isPermanent, currentUser.uid, setCurrentUser)
    navigate('/onboarding')
  }

  // Build maps keyed by other user's UID
  const dmUnreadMap: Record<string, number> = {}
  const dmPreviewMap: Record<string, string> = {}
  for (const rc of recentChats) {
    if (rc.unreadCount > 0) dmUnreadMap[rc.otherUser.uid] = rc.unreadCount
    if (rc.dm.lastMessagePreview) dmPreviewMap[rc.otherUser.uid] = rc.dm.lastMessagePreview
  }

  // Online users to show (exclude self — already filtered by UserCard)
  const onlineOtherUids = new Set(onlineUsers.map((u) => u.uid))

  // Recent chats section: offline users (not in online list) sorted by lastMessageAt
  const recentOffline = recentChats
    .filter((rc) => !onlineOtherUids.has(rc.otherUser.uid) && rc.otherUser.uid !== currentUser?.uid)
    .sort((a, b) => b.dm.lastMessageAt - a.dm.lastMessageAt)

  const handleStartChat = async (targetUid: string) => {
    if (!currentUser) return

    const dmId = getDmId(currentUser.uid, targetUid)
    const dmRef = doc(db, 'dms', dmId)

    // Use recentChats (live subscription) as existence cache to avoid
    // getDoc on a non-existent doc — isParticipant() rule denies reads on missing docs.
    const dmExists = recentChats.some((rc) => rc.dm.id === dmId)

    if (!dmExists) {
      const target =
        onlineUsers.find((u) => u.uid === targetUid) ??
        recentChats.find((rc) => rc.otherUser.uid === targetUid)?.otherUser
      await setDoc(dmRef, {
        participants: [currentUser.uid, targetUid].sort(),
        participantNames: {
          [currentUser.uid]: currentUser.name,
          [targetUid]: target?.name ?? 'User',
        },
        participantGenders: {
          [currentUser.uid]: currentUser.gender ?? 'other',
          [targetUid]: target?.gender ?? 'other',
        },
        participantCountries: {
          [currentUser.uid]: currentUser.country ?? 'IN',
          [targetUid]: target?.country ?? 'IN',
        },
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        lastMessagePreview: '',
        unreadCount: 0,
        lastSenderId: '',
        consecutiveSenderCount: 0,
      })
    }

    navigate(`/dm/${dmId}`)
  }

  return (
    <aside
      className="w-full sm:w-72 flex flex-col border-r border-[var(--border)] bg-[var(--bg-primary)] h-full"
      aria-label="Online users"
    >
      {/* Header — hidden on mobile (page.tsx renders its own header there) */}
      <div className="hidden sm:flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
        <Link to="/" className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-lg">
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
          {loading ? '...' : `${onlineUsers.filter(u => u.uid !== currentUser?.uid).length} Online`}
        </p>
      </div>

      {/* Ad slot — compact on mobile, leaderboard on desktop */}
      <div className="flex justify-center px-2 py-1.5 sm:px-4 sm:py-3 border-b border-[var(--border)]">
        <div className="sm:hidden">
          <AdSlot id="sidebar-top-mobile" width={320} height={32} />
        </div>
        <div className="hidden sm:block">
          <AdSlot id="sidebar-top" width={240} height={60} />
        </div>
      </div>

      {/* Users list */}
      <div
        className="flex-1 overflow-y-auto px-2 py-2"
        aria-label="Users"
      >
        {loading ? (
          <div className="flex flex-col gap-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-[var(--bg-surface)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Online section */}
            {onlineUsers.filter(u => u.uid !== currentUser?.uid).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-3">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[var(--text-muted)]">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <p className="text-sm text-[var(--text-muted)]">No one online yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Be the first to start chatting!</p>
              </div>
            ) : (
              <div role="list" aria-label="Online users">
                {onlineUsers.map((user) => (
                  <div key={user.uid} role="listitem">
                    <UserCard
                      user={user}
                      onStartChat={handleStartChat}
                      currentUid={currentUser?.uid}
                      unreadCount={dmUnreadMap[user.uid]}
                      lastMessage={dmPreviewMap[user.uid]}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Recent Chats section (offline users you've chatted with) */}
            {recentOffline.length > 0 && (
              <div className="mt-3">
                <p className="px-3 mb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Recent Chats
                </p>
                <div role="list" aria-label="Recent chats">
                  {recentOffline.map(({ otherUser, unreadCount, dm }) => (
                    <div key={otherUser.uid} role="listitem">
                      <UserCard
                        user={{ ...otherUser, isOnline: false }}
                        onStartChat={handleStartChat}
                        currentUid={currentUser?.uid}
                        unreadCount={unreadCount}
                        lastMessage={dm.lastMessagePreview || undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ad slot — compact on mobile, medium rectangle on desktop */}
      <div className="flex justify-center px-2 py-1.5 sm:px-4 sm:py-3 border-t border-[var(--border)]">
        <div className="sm:hidden">
          <AdSlot id="sidebar-bottom-mobile" width={320} height={50} />
        </div>
        <div className="hidden sm:block">
          <AdSlot id="sidebar-bottom" width={240} height={250} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        {/* Nav links */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)] mb-2">
          <Link to="/privacy-policy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link>
          {currentUser && !currentUser.isPermanent && (
            <Link to="/register" className="text-[var(--accent)] font-medium hover:underline">
              Save Account
            </Link>
          )}
        </div>

        {/* Current user row */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
              aria-label="Edit your profile"
            >
              <UserAvatar
                name={currentUser.name}
                gender={currentUser.gender}
                country={currentUser.country}
                size="sm"
                showFlag={false}
                avatarUrl={currentUser.avatarUrl}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{currentUser.name}</p>
                <p className="text-xs text-[var(--text-muted)]">Edit profile</p>
              </div>
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs text-[var(--danger)] hover:underline flex-shrink-0"
              aria-label="Sign out"
            >
              {currentUser.isPermanent ? 'Sign out' : 'Leave & delete'}
            </button>
          </div>
        )}
      </div>

      {showEditProfile && (
        <EditProfileSheet onClose={() => setShowEditProfile(false)} />
      )}
    </aside>
  )
}
