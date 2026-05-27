'use client'

import { useEffect, useRef } from 'react'
import FocusTrap from 'focus-trap-react'

interface EmojiPickerWrapperProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  isDark: boolean
}

export function EmojiPickerWrapper({ onSelect, onClose, isDark }: EmojiPickerWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let picker: any = null

    // Dynamically import emoji-mart to avoid SSR issues
    Promise.all([
      import('emoji-mart').then((m) => m.Picker),
      import('@emoji-mart/data'),
    ]).then(([Picker, data]) => {
      picker = new Picker({
        data: (data as any).default ?? data,
        theme: isDark ? 'dark' : 'light',
        onEmojiSelect: (emoji: any) => {
          onSelect(emoji.native)
          onClose()
        },
        previewPosition: 'none',
        skinTonePosition: 'none',
      })
      if (containerRef.current) {
        containerRef.current.appendChild(picker as any)
      }
    })

    return () => {
      if (containerRef.current && picker) {
        try { containerRef.current.removeChild(picker as any) } catch {}
      }
    }
  }, [isDark, onSelect, onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-end justify-center sm:justify-start"
      role="dialog"
      aria-modal="true"
      aria-label="Emoji picker"
    >
      <div className="absolute inset-0 bg-transparent" onClick={onClose} aria-hidden="true" />
      <FocusTrap>
        <div
          className="relative bottom-0 animate-slide-up"
          style={{ zIndex: 51 }}
        >
          <div ref={containerRef} />
        </div>
      </FocusTrap>
    </div>
  )
}
