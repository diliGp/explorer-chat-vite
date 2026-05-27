'use client'

import { useEffect, useRef } from 'react'
import type { Message, ReplyTo } from '@/types'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { format, isToday, isYesterday } from 'date-fns'

interface MessageListProps {
  messages: Message[]
  currentUid: string
  typingNames: string[]
  onReply: (replyTo: ReplyTo) => void
  onReport: (msgId: string) => void
  onViewImage: (message: Message) => Promise<string | null>
  loading: boolean
}

function DateDivider({ date }: { date: Date }) {
  let label: string
  if (isToday(date)) label = 'Today'
  else if (isYesterday(date)) label = 'Yesterday'
  else label = format(date, 'MMMM d, yyyy')

  return (
    <div className="flex items-center gap-3 px-4 py-3" aria-label={`Messages from ${label}`}>
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  )
}

export function MessageList({
  messages,
  currentUid,
  typingNames,
  onReply,
  onReport,
  onViewImage,
  loading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevLengthRef.current = messages.length
  }, [messages.length])

  // Group messages by date
  const groups: { date: Date; messages: Message[] }[] = []
  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt)
    const last = groups[groups.length - 1]
    if (!last || !isSameDay(last.date, msgDate)) {
      groups.push({ date: msgDate, messages: [msg] })
    } else {
      last.messages.push(msg)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-label="Loading messages" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-4">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[var(--text-muted)]">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">No messages yet</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Send a message to get the conversation started!</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto py-2"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      {groups.map((group, gi) => (
        <div key={gi}>
          <DateDivider date={group.date} />
          {group.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === currentUid}
              onReply={onReply}
              onReport={onReport}
              onViewImage={onViewImage}
            />
          ))}
        </div>
      ))}

      <TypingIndicator names={typingNames} />

      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
