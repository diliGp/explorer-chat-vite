import type { Metadata } from 'next'
import { ProfileForm } from '@/components/onboarding/ProfileForm'
import { AdSlot } from '@/components/layout/AdSlot'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Get Started — ChatApp',
  description: 'Create your free chat profile and start meeting people.',
}

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] flex flex-col">
      {/* Top ad */}
      <div className="flex justify-center py-3 border-b border-[var(--border)]">
        <AdSlot id="onboarding-top" width={728} height={90} className="max-w-full" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[var(--accent)] rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              C
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to ChatApp</h1>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Create a free profile to start chatting with people around the world.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm">
            <ProfileForm />
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Bottom ad */}
      <div className="flex justify-center py-3 border-t border-[var(--border)]">
        <AdSlot id="onboarding-bottom" width={320} height={50} />
      </div>
    </div>
  )
}
