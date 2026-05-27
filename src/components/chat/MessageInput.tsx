'use client'

import { useState, useRef, useCallback } from 'react'
import { useTyping } from '@/lib/hooks/useTyping'
import type { ReplyTo } from '@/types'
import { ReplyPreview } from './ReplyPreview'
import { GifPicker } from './GifPicker'
import { EmojiPickerWrapper } from './EmojiPickerWrapper'

interface MessageInputProps {
  dmId: string
  currentUid: string
  participants: string[]
  replyTo: ReplyTo | null
  onCancelReply: () => void
  onSendText: (text: string, replyTo?: ReplyTo) => Promise<void>
  onSendGif: (url: string, replyTo?: ReplyTo) => Promise<void>
  onSendImage: (file: File, replyTo?: ReplyTo) => Promise<void>
  isDark: boolean
  /** When true the anonymous sender has hit the 2-message unanswered limit */
  isRateLimited?: boolean
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function MessageInput({
  dmId,
  currentUid,
  participants,
  replyTo,
  onCancelReply,
  onSendText,
  onSendGif,
  onSendImage,
  isDark,
  isRateLimited = false,
}: MessageInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { handleInputChange, stopTyping } = useTyping(dmId, currentUid, participants)

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    handleInputChange()
    adjustHeight()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending || isRateLimited) return
    setSending(true)
    stopTyping()
    try {
      await onSendText(text.trim(), replyTo ?? undefined)
      setText('')
      onCancelReply()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }, [text, sending, isRateLimited, replyTo, onSendText, onCancelReply, stopTyping])

  const handleGifSelect = async (url: string) => {
    if (isRateLimited) return
    await onSendGif(url, replyTo ?? undefined)
    onCancelReply()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isRateLimited) {
      e.target.value = ''
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Only JPEG, PNG, GIF, and WebP images are allowed.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('Image must be under 2MB.')
      return
    }

    setSending(true)
    try {
      await onSendImage(file, replyTo ?? undefined)
      onCancelReply()
    } finally {
      setSending(false)
      e.target.value = ''
    }
  }

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)
    requestAnimationFrame(() => {
      el.setSelectionRange(start + emoji.length, start + emoji.length)
      el.focus()
    })
  }

  return (
    <div className="flex flex-col border-t border-[var(--border)] bg-[var(--bg-primary)]">
      {/* Rate-limit banner */}
      {isRateLimited && (
        <div className="mx-3 mt-3 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] text-center">
          ⏳ Wait for a reply before sending more messages.
        </div>
      )}

      {/* Reply preview */}
      {replyTo && !isRateLimited && (
        <div className="px-4 pt-3">
          <ReplyPreview replyTo={replyTo} onCancel={onCancelReply} />
        </div>
      )}

      {/* Input row */}
      <div className={`flex items-end gap-2 px-3 py-3 ${isRateLimited ? 'opacity-40 pointer-events-none select-none' : ''}`}>
        {/* Emoji button */}
        <button
          onClick={() => { setShowEmoji(!showEmoji); setShowGif(false) }}
          aria-label="Open emoji picker"
          aria-expanded={showEmoji}
          disabled={isRateLimited}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
          </svg>
        </button>

        {/* GIF button */}
        <button
          onClick={() => { setShowGif(!showGif); setShowEmoji(false) }}
          aria-label="Open GIF picker"
          aria-expanded={showGif}
          disabled={isRateLimited}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-xs"
        >
          GIF
        </button>

        {/* Image upload */}
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Attach image"
          disabled={isRateLimited}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload image"
        />

        {/* Text area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isRateLimited ? 'Waiting for a reply...' : 'Type a message...'}
            rows={1}
            disabled={isRateLimited}
            className="w-full bg-[var(--bg-surface)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none transition-all disabled:cursor-not-allowed"
            style={{ minHeight: 40, maxHeight: 120 }}
            aria-label="Message input"
            aria-multiline="true"
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || isRateLimited}
          aria-label="Send message"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>

      {/* Pickers (hidden when rate-limited) */}
      {showGif && !isRateLimited && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGif(false)}
        />
      )}
      {showEmoji && !isRateLimited && (
        <EmojiPickerWrapper
          onSelect={insertEmoji}
          onClose={() => setShowEmoji(false)}
          isDark={isDark}
        />
      )}
    </div>
  )
}
