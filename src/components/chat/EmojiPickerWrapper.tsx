import { useEffect, useRef } from 'react'

interface EmojiPickerWrapperProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  isDark: boolean
}

export function EmojiPickerWrapper({ onSelect, onClose, isDark }: EmojiPickerWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Stable refs so the picker effect doesn't re-run on every render
  const onSelectRef = useRef(onSelect)
  const onCloseRef = useRef(onClose)
  onSelectRef.current = onSelect
  onCloseRef.current = onClose

  useEffect(() => {
    let cancelled = false
    let picker: any = null

    Promise.all([
      import('emoji-mart').then((m) => m.Picker),
      import('@emoji-mart/data'),
    ]).then(([Picker, data]) => {
      if (cancelled || !containerRef.current) return
      // Clear any leftover nodes (StrictMode double-invoke safety)
      containerRef.current.innerHTML = ''
      picker = new Picker({
        data: (data as any).default ?? data,
        theme: isDark ? 'dark' : 'light',
        onEmojiSelect: (emoji: any) => {
          onSelectRef.current(emoji.native)
          onCloseRef.current()
        },
        previewPosition: 'none',
        skinTonePosition: 'none',
      })
      if (!cancelled && containerRef.current) {
        containerRef.current.appendChild(picker as any)
      }
    })

    return () => {
      cancelled = true
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [isDark])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, []) // stable — uses ref

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-end justify-center sm:justify-start"
      role="dialog"
      aria-modal="true"
      aria-label="Emoji picker"
    >
      <div className="absolute inset-0 bg-transparent" onMouseDown={onClose} aria-hidden="true" />
      <div
        className="relative bottom-0 animate-slide-up"
        style={{ zIndex: 51 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={containerRef} />
      </div>
    </div>
  )
}
