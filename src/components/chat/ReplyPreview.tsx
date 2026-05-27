import type { ReplyTo } from '@/types'

interface ReplyPreviewProps {
  replyTo: ReplyTo
  onCancel?: () => void
  compact?: boolean
}

export function ReplyPreview({ replyTo, onCancel, compact = false }: ReplyPreviewProps) {
  return (
    <div className={`flex items-start gap-2 ${compact ? 'px-3 py-2 bg-[var(--bg-surface)] rounded-lg' : 'px-4 py-2.5 bg-[var(--accent-light)] border-l-2 border-[var(--accent)] rounded-r-lg'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--accent)] truncate">
          {replyTo.senderName}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
          {replyTo.preview}
        </p>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          aria-label="Cancel reply"
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--bg-elevated)] transition-colors flex-shrink-0"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
}
