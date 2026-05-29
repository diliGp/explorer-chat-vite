import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { upgradeWithGoogle, upgradeWithEmail } from '@/lib/firebase/auth'
import { updateDoc } from 'firebase/firestore'
import { userDoc } from '@/lib/firebase/firestore'
import { useAppStore } from '@/store'
import { AdSlot } from '@/components/layout/AdSlot'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { currentUser, setCurrentUser } = useAppStore()
  const [mode, setMode] = useState<'options' | 'email'>('options')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleGoogle = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const { user: firebaseUser, merged } = await upgradeWithGoogle()
      // Write email + displayName back to Firestore profile and mark permanent
      await updateDoc(userDoc(firebaseUser.uid), {
        isPermanent: true,
        ...(firebaseUser.email ? { email: firebaseUser.email } : {}),
        ...(firebaseUser.displayName ? { name: firebaseUser.displayName } : {}),
      })
      setCurrentUser({ ...currentUser, isPermanent: true })
      toast.success(
        merged
          ? 'Welcome back! Your chats have been merged into your account.'
          : 'Account saved! Welcome back.'
      )
      navigate('/')
    } catch (err: any) {
      toast.error('Failed to link Google. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address'
    }
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters'
    }
    if (password !== confirm) {
      errs.confirm = 'Passwords do not match'
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (!currentUser) return
    setLoading(true)
    try {
      const { user: firebaseUser, merged } = await upgradeWithEmail(email, password)
      // Write email back to Firestore profile and mark permanent
      await updateDoc(userDoc(firebaseUser.uid), {
        isPermanent: true,
        email: firebaseUser.email ?? email,
      })
      setCurrentUser({ ...currentUser, isPermanent: true })
      toast.success(
        merged
          ? 'Welcome back! Your chats have been merged into your account.'
          : 'Account saved!'
      )
      navigate('/')
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrors({ email: 'Account exists but password is incorrect. Try again.' })
      } else {
        toast.error('Failed to create account. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] flex flex-col">
      {/* Top ad */}
      <div className="flex justify-center py-3 border-b border-[var(--border)]">
        <AdSlot id="register-top" width={728} height={90} className="max-w-full" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Save your account</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">Keep your chat history &amp; profile forever.</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm">
            {mode === 'options' ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--text-muted)]">or</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                <button
                  onClick={() => setMode('email')}
                  className="w-full py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] font-medium text-sm transition-colors"
                >
                  Continue with Email
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmail} className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setMode('options')}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-1"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6"/></svg>
                  Back
                </button>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p role="alert" className="mt-1 text-xs text-[var(--danger)]">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    aria-invalid={!!errors.password}
                  />
                  {errors.password && <p role="alert" className="mt-1 text-xs text-[var(--danger)]">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Confirm Password</label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    aria-invalid={!!errors.confirm}
                  />
                  {errors.confirm && <p role="alert" className="mt-1 text-xs text-[var(--danger)]">{errors.confirm}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Create Account'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-4">
            <Link to="/" className="text-[var(--accent)] hover:underline">Continue as guest</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
