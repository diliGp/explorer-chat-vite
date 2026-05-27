'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import FocusTrap from 'focus-trap-react'

interface GifResult {
  id: string
  url: string
  preview: string
  width: number
  height: number
}

interface GifPickerProps {
  onSelect: (url: string) => void
  onClose: () => void
}

const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || ''
const TENOR_BASE = 'https://tenor.googleapis.com/v2'

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchGifs = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const endpoint = q
        ? `${TENOR_BASE}/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=24&media_filter=gif`
        : `${TENOR_BASE}/featured?key=${TENOR_KEY}&limit=24&media_filter=gif`
      const res = await fetch(endpoint)
      const data = await res.json()
      const results: GifResult[] = (data.results ?? []).map((r: any) => ({
        id: r.id,
        url: r.media_formats?.gif?.url ?? '',
        preview: r.media_formats?.tinygif?.url ?? r.media_formats?.gif?.url ?? '',
        width: r.media_formats?.gif?.dims?.[0] ?? 200,
        height: r.media_formats?.gif?.dims?.[1] ?? 150,
      }))
      setGifs(results)
    } catch {
      setGifs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGifs('')
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [fetchGifs])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(value), 400)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="GIF picker"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <FocusTrap>
        <div className="relative w-full sm:max-w-md bg-[var(--bg-primary)] rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={handleSearch}
              placeholder="Search GIFs..."
              className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Search GIFs"
            />
            <button
              onClick={onClose}
              aria-label="Close GIF picker"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* GIF grid */}
          <div
            className="overflow-y-auto p-3"
            style={{ height: 360 }}
            role="listbox"
            aria-label="GIF results"
          >
            {loading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bg-[var(--bg-surface)] rounded-lg animate-pulse" style={{ height: 80 }} />
                ))}
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
                {query ? 'No GIFs found' : 'Type to search GIFs'}
              </div>
            ) : (
              <div className="columns-3 gap-2 space-y-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => { onSelect(gif.url); onClose() }}
                    role="option"
                    aria-selected="false"
                    aria-label="Select GIF"
                    className="w-full rounded-lg overflow-hidden hover:opacity-80 transition-opacity focus:ring-2 focus:ring-[var(--accent)] focus:outline-none"
                  >
                    <img
                      src={gif.preview}
                      alt="GIF"
                      className="w-full object-cover"
                      loading="lazy"
                      style={{ display: 'block' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] text-center">Powered by Tenor</p>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}
