'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { Sidebar } from '@/components/layout/Sidebar'
import { AdSlot } from '@/components/layout/AdSlot'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import Link from 'next/link'

export default function HomePage() {
  const { currentUser } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser === null) {
        router.push('/onboarding')
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [currentUser, router])

  if (!currentUser) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-[var(--accent)] rounded-2xl flex items-center justify-center text-white text-xl font-bold animate-pulse">
            C
          </div>
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex overflow-hidden bg-[var(--bg-primary)]" id="main-content">
      {/* Sidebar (desktop hidden on mobile, shown via separate panel) */}
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top banner ad */}
        <div className="hidden lg:flex justify-center py-2 border-b border-[var(--border)]">
          <AdSlot id="home-top-banner" width={728} height={90} />
        </div>

        {/* Mobile header */}
        <div className="flex sm:hidden items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="font-bold text-[var(--text-primary)] text-lg flex items-center gap-2">
            <span className="w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white text-sm">C</span>
            ChatApp
          </span>
          <ThemeToggle />
        </div>

        {/* Mobile: show sidebar inline */}
        <div className="flex-1 flex flex-col sm:hidden overflow-hidden">
          <Sidebar />
        </div>

        {/* Desktop: empty state prompt */}
        <div className="hidden sm:flex flex-1 flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-[var(--accent-light)] flex items-center justify-center mb-6">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={1.5}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Pick someone to chat with</h2>
          <p className="text-[var(--text-muted)] text-sm max-w-xs">
            Select a user from the sidebar to start a private conversation.
          </p>

          {!currentUser.isPermanent && (
            <div className="mt-8 p-5 bg-[var(--accent-light)] rounded-2xl border border-[var(--accent)]/20 max-w-sm w-full">
              <p className="text-sm font-semibold text-[var(--accent)] mb-1">Save your account</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                You&apos;re chatting as a guest. Register to keep your chat history and profile permanently.
              </p>
              <Link
                href="/register"
                className="inline-block px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                Save Account
              </Link>
            </div>
          )}

          <div className="mt-8">
            <AdSlot id="home-main-ad" width={300} height={250} />
          </div>
        </div>
      </main>
    </div>
  )
}
