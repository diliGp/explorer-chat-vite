'use client'

import { useState } from 'react'
import type { OnlineUser } from '@/types'
import { UserAvatar } from './UserAvatar'
import { ProfileSheet } from './ProfileSheet'

interface UserCardProps {
  user: OnlineUser
  onStartChat: (uid: string) => void
  currentUid?: string
}

export function UserCard({ user, onStartChat, currentUid }: UserCardProps) {
  const [showProfile, setShowProfile] = useState(false)

  if (user.uid === currentUid) return null

  return (
    <>
      <button
        onClick={() => setShowProfile(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors text-left group"
        aria-label={`View ${user.name}'s profile`}
      >
        <UserAvatar
          name={user.name}
          gender={user.gender}
          country={user.country}
          isOnline={user.isOnline}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {user.name}
          </p>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {user.city ? `${user.city}, ` : ''}{user.country}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[var(--text-muted)]">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>

      {showProfile && (
        <ProfileSheet
          user={user}
          onClose={() => setShowProfile(false)}
          onStartChat={() => {
            setShowProfile(false)
            onStartChat(user.uid)
          }}
        />
      )}
    </>
  )
}
