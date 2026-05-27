'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import type { Message, ReplyTo } from '@/types'
import { ReplyPreview } from './ReplyPreview'
import { ImageMessage } from './ImageMessage'

interface MessageBubbleProps {
  message: Message
  isSelf: boolean
  onReply: (replyTo: ReplyTo) => void
  onReport: (msgId: string) => void
  onViewImage: (message: Message) => Promise<string | null>
}

export function MessageBubble({ message, isSelf, onReply, onReport, onViewImage }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const touchStart = useRef<number>(0)
  const touchX = useRef<number>(0)

  if (message.deletedAt && message.type === 'text') {
    return (
      <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} px-4 py-0.5`}>
        <div className="text-xs text-[var(--text-muted)] italic px-2">
          Message deleted
        </div>
      </div>
    )
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = Date.now()
    touchX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const elapsed = Date.now() - touchStart.current
    const deltaX = e.changedTouches[0].clientX - touchX.current

    // Long press → show actions
    if (elapsed > 500 && Math.abs(deltaX) < 10) {
      setShowActions(true)
      return
    }
    // Swipe right → reply
    if (deltaX > 60 && elapsed < 400) {
      triggerReply()
    }
  }

  const triggerReply = () => {
    const preview = message.type === 'text'
      ? (message.text ?? '').slice(0, 80)
      : message.type === 'gif' ? '[GIF]' : '[Image]'
    onReply({ msgId: message.id, senderId: message.senderId, senderName: message.senderName, preview })
  }

  const time = format(new Date(message.createdAt), 'HH:mm')

  return (
    <div
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'} px-4 py-0.5 group animate-fade-in`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`max-w-[75%] flex flex-col ${isSelf ? 'items-end' : 'items-start'} gap-1`}>
        {/* Sender name (non-self only) */}
        {!isSelf && (
          <span className="text-xs font-medium text-[var(--accent)] px-1">{message.senderName}</span>
        )}

        {/* Reply context */}
        {message.replyTo && (
          <div className={`w-full ${isSelf ? 'pr-1' : 'pl-1'}`}>
            <ReplyPreview replyTo={message.replyTo} compact />
          </div>
        )}

        {/* Bubble */}
        <div
          className={`${isSelf ? 'bubble-self' : 'bubble-other'} px-3 py-2 max-w-full`}
          onDoubleClick={triggerReply}
        >
          {message.type === 'text' && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}
          {message.type === 'gif' && message.gifUrl && (
            <img
              src={message.gifUrl}
              alt="GIF"
              className="rounded-lg max-w-full"
              style={{ maxWidth: 240, maxHeight: 180 }}
              loading="lazy"
            />
          )}
          {message.type === 'image' && (
            <ImageMessage
              message={message}
              isSelf={isSelf}
              onView={onViewImage}
            />
          )}
        </div>

        {/* Timestamp + actions */}
        <div className={`flex items-center gap-2 px-1 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-[var(--text-muted)]">{time}</span>

          {/* Desktop hover actions */}
          <div className={`hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button
              onClick={triggerReply}
              aria-label="Reply to message"
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 17l-4-4 4-4M5 13h11a4 4 0 000-8H5"/>
              </svg>
            </button>
            {!isSelf && (
              <button
                onClick={() => onReport(message.id)}
                aria-label="Report message"
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors text-[var(--danger)]"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile actions overlay */}
      {showActions && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          onClick={() => setShowActions(false)}
        >
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
          <div className="relative z-50 w-full max-w-sm bg-[var(--bg-primary)] rounded-t-2xl p-4 animate-slide-up">
            <button
              className="w-full py-3 text-sm font-medium flex items-center gap-3 hover:bg-[var(--bg-surface)] rounded-xl px-3"
              onClick={(e) => { e.stopPropagation(); triggerReply(); setShowActions(false) }}
            >
              Reply
            </button>
            {!isSelf && (
              <button
                className="w-full py-3 text-sm font-medium text-[var(--danger)] flex items-center gap-3 hover:bg-[var(--bg-surface)] rounded-xl px-3"
                onClick={(e) => { e.stopPropagation(); onReport(message.id); setShowActions(false) }}
              >
                Report
              </button>
            )}
            <button
              className="w-full py-3 text-sm font-medium text-[var(--text-muted)] flex items-center gap-3 hover:bg-[var(--bg-surface)] rounded-xl px-3"
              onClick={() => setShowActions(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
