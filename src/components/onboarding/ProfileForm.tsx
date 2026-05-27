'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { auth } from '@/lib/firebase/client'
import { useAppStore } from '@/store'
import { validateAge } from '@/lib/utils/ageGate'
import { COUNTRIES } from '@/lib/utils/countries'
import type { Gender, UserProfile } from '@/types'
import toast from 'react-hot-toast'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function ProfileForm() {
  const router = useRouter()
  const { setCurrentUser } = useAppStore()
  const [form, setForm] = useState({
    name: '',
    birthdate: '',
    gender: '' as Gender | '',
    country: 'US',
    city: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters'
    }
    if (form.name.trim().length > 30) {
      errs.name = 'Name must be 30 characters or less'
    }
    if (!form.birthdate) {
      errs.birthdate = 'Date of birth is required'
    } else {
      const { eligible, error } = validateAge(form.birthdate, form.country)
      if (!eligible) errs.birthdate = error ?? 'Age requirement not met'
    }
    if (!form.gender) {
      errs.gender = 'Please select a gender'
    }
    if (!form.country) {
      errs.country = 'Please select a country'
    }
    if (!consentChecked) {
      errs.consent = 'You must agree to the Terms of Service and Privacy Policy'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const uid = auth.currentUser?.uid
    if (!uid) {
      toast.error('Please wait while we set up your session...')
      return
    }

    setSaving(true)
    try {
      const ageResult = validateAge(form.birthdate, form.country)
      const profile: Omit<UserProfile, 'uid'> = {
        name: form.name.trim(),
        age: ageResult.age,
        gender: form.gender as Gender,
        country: form.country,
        city: form.city.trim() || undefined,
        isPermanent: false,
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
        isBlocked: false,
        reportCount: 0,
        blockedUsers: [],
      }

      await setDoc(doc(db, 'users', uid), profile)
      setCurrentUser({ ...profile, uid })
      toast.success('Welcome to ChatApp!')
      router.push('/')
    } catch (err) {
      toast.error('Failed to create profile. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const field = (key: string) => ({
    value: (form as any)[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  })

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-label="Create your profile">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Display name <span aria-hidden="true" className="text-[var(--danger)]">*</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="nickname"
          maxLength={30}
          placeholder="How should others call you?"
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] border border-transparent aria-[invalid=true]:border-[var(--danger)]"
          {...field('name')}
        />
        {errors.name && <p id="name-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">{errors.name}</p>}
      </div>

      {/* Birthdate */}
      <div>
        <label htmlFor="birthdate" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Date of birth <span aria-hidden="true" className="text-[var(--danger)]">*</span>
        </label>
        <input
          id="birthdate"
          type="date"
          max={new Date().toISOString().split('T')[0]}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)] border border-transparent aria-[invalid=true]:border-[var(--danger)]"
          {...field('birthdate')}
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">You must be 13+ (16+ in EU) to use ChatApp.</p>
        {errors.birthdate && <p id="birthdate-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">{errors.birthdate}</p>}
      </div>

      {/* Gender */}
      <div>
        <fieldset>
          <legend className="text-sm font-medium text-[var(--text-primary)] mb-2">
            Gender <span aria-hidden="true" className="text-[var(--danger)]">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  form.gender === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                    : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={opt.value}
                  checked={form.gender === opt.value}
                  onChange={() => setForm((f) => ({ ...f, gender: opt.value }))}
                  className="sr-only"
                />
                <span className="text-sm text-[var(--text-primary)]">{opt.label}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p id="gender-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">{errors.gender}</p>}
        </fieldset>
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Country <span aria-hidden="true" className="text-[var(--danger)]">*</span>
        </label>
        <select
          id="country"
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)] border border-transparent"
          {...field('country')}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* City (optional) */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          City <span className="text-[var(--text-muted)] font-normal">(optional)</span>
        </label>
        <input
          id="city"
          type="text"
          placeholder="e.g. New York"
          maxLength={50}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          {...field('city')}
        />
      </div>

      {/* Consent */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--accent)] flex-shrink-0"
            aria-describedby="consent-error"
          />
          <span className="text-sm text-[var(--text-secondary)]">
            I am 13 or older (16+ if in the EU), and I agree to the{' '}
            <a href="/terms" target="_blank" className="text-[var(--accent)] hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy-policy" target="_blank" className="text-[var(--accent)] hover:underline">Privacy Policy</a>.
          </span>
        </label>
        {errors.consent && <p id="consent-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">{errors.consent}</p>}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Setting up your profile...
          </span>
        ) : (
          'Start Chatting'
        )}
      </button>
    </form>
  )
}
