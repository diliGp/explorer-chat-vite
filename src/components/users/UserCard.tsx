import type { OnlineUser } from '@/types'
import { UserAvatar } from './UserAvatar'

interface UserCardProps {
  user: OnlineUser
  onStartChat: (uid: string) => void
  currentUid?: string
  unreadCount?: number
  lastMessage?: string
}

export function UserCard({ user, onStartChat, currentUid, unreadCount, lastMessage }: UserCardProps) {
  if (user.uid === currentUid) return null

  const hasUnread = unreadCount != null && unreadCount > 0
  const subtitle = lastMessage ?? (user.city ? `${user.city}` : user.country)

  return (
    <button
      onClick={() => onStartChat(user.uid)}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors text-left group"
      aria-label={`Chat with ${user.name}`}
    >
      <UserAvatar
        name={user.name}
        gender={user.gender}
        country={user.country}
        isOnline={user.isOnline}
        size="md"
        avatarUrl={user.avatarUrl}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${hasUnread ? 'font-bold text-[var(--text-primary)]' : 'font-semibold text-[var(--text-primary)]'}`}>
          {user.name}
        </p>
        <p className={`text-xs truncate ${hasUnread ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          {subtitle}
        </p>
      </div>
      {hasUnread ? (
        <span className="flex-shrink-0 min-w-[20px] h-5 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center px-1.5">
          {unreadCount! > 99 ? '99+' : unreadCount}
        </span>
      ) : (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[var(--text-muted)]">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      )}
    </button>
  )
}
