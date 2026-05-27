'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useAppStore } from '@/store'
import { useMessages, RateLimitError } from '@/lib/hooks/useMessages'
import { useTyping, useTypingStatus } from '@/lib/hooks/useTyping'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { ClearChatMenu } from '@/components/chat/ClearChatMenu'
import { UserAvatar } from '@/components/users/UserAvatar'
import { AdSlot } from '@/components/layout/AdSlot'
import { Sidebar } from '@/components/layout/Sidebar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { dmDoc } from '@/lib/firebase/firestore'
import { onSnapshot } from 'firebase/firestore'
import type { DM, ReplyTo } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function DmPage() {
  const params = useParams()
  const dmId = params.userId as string // route param is actually dmId
  const router = useRouter()
  const { currentUser } = useAppStore()
  const [dm, setDm] = useState<DM | null>(null)
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!dmId) return
    const unsub = onSnapshot(dmDoc(dmId), (snap) => {
      if (snap.exists()) setDm({ ...snap.data(), id: snap.id } as DM)
      else router.push('/')
    })
    return unsub
  }, [dmId, router])

  const uid = currentUser?.uid ?? ''
  const name = currentUser?.name ?? 'You'
  const isPermanent = currentUser?.isPermanent ?? false

  const { messages, loading, sendText, sendGif, sendImage, viewImage, reportMessage, clearChat } = useMessages(
    dmId, uid, name, isPermanent
  )

  // Derive whether this anonymous user is rate-limited (sent ≥2 unanswered messages)
  const isRateLimited =
    !isPermanent &&
    dm != null &&
    (dm.consecutiveSenderCount ?? 0) >= 2 &&
    dm.lastSenderId === uid

  const participants = dm?.participants ?? []
  const typingUids = useTypingStatus(dmId, participants, uid)

  // Determine the other user's info
  const otherUid = participants.find((p) => p !== uid) ?? ''
  const otherName = dm?.participantNames?.[otherUid] ?? 'User'

  const handleClearChat = async () => {
    await clearChat()
    toast.success('Chat cleared.')
  }

  const handleReport = async (msgId: string) => {
    if (!uid) return
    await reportMessage(msgId, uid)
    toast.success('Message reported. Thank you.')
  }

  const handleSendText = async (text: string, replyTo?: ReplyTo) => {
    try {
      await sendText(text, replyTo)
    } catch (err) {
      if (err instanceof RateLimitError) {
        toast.error('Wait for a reply before sending more messages.')
      } else {
        throw err
      }
    }
  }

  const handleSendGif = async (url: string, replyTo?: ReplyTo) => {
    try {
      await sendGif(url, replyTo)
    } catch (err) {
      if (err instanceof RateLimitError) {
        toast.error('Wait for a reply before sending more messages.')
      } else {
        throw err
      }
    }
  }

  const handleSendImage = async (file: File, replyTo?: ReplyTo) => {
    try {
      await sendImage(file, replyTo)
    } catch (err) {
      if (err instanceof RateLimitError) {
        toast.error('Wait for a reply before sending more messages.')
      } else {
        throw err
      }
    }
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="h-dvh flex overflow-hidden bg-[var(--bg-primary)]" id="main-content">
      {/* Sidebar */}
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      {/* Chat area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top ad */}
        <div className="hidden lg:flex justify-center py-2 border-b border-[var(--border)] flex-shrink-0">
          <AdSlot id="dm-top-banner" width={728} height={90} />
        </div>

        {/* Chat column + right ad */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
              {/* Back button (mobile) */}
              <Link
                href="/"
                className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
                aria-label="Back to users list"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </Link>

              <UserAvatar
                name={otherName}
                gender={dm?.participantGenders?.[otherUid] ?? 'other'}
                country={dm?.participantCountries?.[otherUid] ?? 'US'}
                isOnline
                size="md"
                showFlag={false}
              />

              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{otherName}</h1>
                <p className="text-xs text-[var(--text-muted)]">
                  {typingUids.length > 0 ? 'typing...' : 'Online'}
                </p>
              </div>

              <ThemeToggle />
              <ClearChatMenu onClearChat={handleClearChat} />
            </header>

            {/* Messages */}
            <MessageList
              messages={messages}
              currentUid={uid}
              typingNames={typingUids.map((u) => dm?.participantNames?.[u] ?? u)}
              onReply={setReplyTo}
              onReport={handleReport}
              onViewImage={viewImage}
              loading={loading}
            />

            {/* Input */}
            <MessageInput
              dmId={dmId}
              currentUid={uid}
              participants={participants}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onSendText={handleSendText}
              onSendGif={handleSendGif}
              onSendImage={handleSendImage}
              isDark={isDark}
              isRateLimited={isRateLimited}
            />

            {/* Mobile bottom ad — above keyboard */}
            <div className="flex lg:hidden justify-center py-1 border-t border-[var(--border)] flex-shrink-0">
              <AdSlot id="dm-mobile-bottom" width={320} height={50} />
            </div>
          </div>

          {/* Right rail ad (desktop) */}
          <div className="hidden xl:flex flex-col items-center py-4 px-3 border-l border-[var(--border)] gap-4 flex-shrink-0">
            <AdSlot id="dm-right-rail" width={160} height={600} />
          </div>
        </div>
      </main>
    </div>
  )
}
