import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { auth } from '@/lib/firebase/client';
import { setupPresence } from '@/lib/firebase/rtdb';
import { useAppStore } from '@/store';
import type { Gender, UserProfile } from '@/types';
import toast from 'react-hot-toast';

const MIN_AGE = 13;
const MAX_AGE = 120;

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

async function detectCountry(): Promise<string> {
    // 1. Try browser geolocation + reverse geocode
    try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await res.json();
        const code = data.address?.country_code?.toUpperCase();
        if (code) return code;
    } catch {
        /* denied or timed out — fall through */
    }

    // 2. IP-based lookup
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const code = data.country_code?.toUpperCase();
        if (code) return code;
    } catch {
        /* network error — fall through */
    }

    // 3. Final fallback
    return 'IN';
}

export function ProfileForm() {
    const navigate = useNavigate();
    const { setCurrentUser, setAuthReady } = useAppStore();
    const [detectedCountry, setDetectedCountry] = useState('US');
    const [form, setForm] = useState({
        name: '',
        age: '',
        gender: '' as Gender | '',
        location: '',
        bio: '',
    });

    useEffect(() => {
        detectCountry().then(setDetectedCountry);
    }, []);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [consentChecked, setConsentChecked] = useState(false);

    const validate = (): boolean => {
        const errs: Record<string, string> = {};

        const name = form.name.trim();
        if (name.length < 2) errs.name = 'Name must be at least 2 characters';
        else if (name.length > 30) errs.name = 'Name must be 30 characters or less';

        const age = parseInt(form.age, 10);
        if (!form.age || isNaN(age)) {
            errs.age = 'Please enter your age';
        } else if (age < MIN_AGE) {
            errs.age = `You must be at least ${MIN_AGE} to use ChatApp`;
        } else if (age > MAX_AGE) {
            errs.age = 'Please enter a valid age';
        }

        if (!form.gender) errs.gender = 'Please select a gender';

        if (!form.location.trim()) errs.location = 'Please enter your location';

        if (!consentChecked)
            errs.consent = 'You must agree to the Terms of Service and Privacy Policy';

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const uid = auth.currentUser?.uid;
        if (!uid) {
            toast.error('Please wait while we set up your session...');
            return;
        }

        setSaving(true);
        try {
            const location = form.location.trim();
            const profile: UserProfile = {
                uid,
                name: form.name.trim(),
                age: parseInt(form.age, 10),
                gender: form.gender as Gender,
                country: detectedCountry,
                city: location,
                bio: form.bio.trim() || '',
                isPermanent: false,
                isOnline: true,
                lastSeen: Date.now(),
                createdAt: Date.now(),
                isBlocked: false,
                reportCount: 0,
                blockedUsers: [],
            };

            await setDoc(doc(db, 'users', uid), profile);
            setupPresence(uid);
            setCurrentUser(profile);
            setAuthReady(true);
            toast.success('Welcome to ChatApp!');
            navigate('/');
        } catch (err) {
            toast.error('Failed to create profile. Please try again.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const field = (key: string) => ({
        value: (form as any)[key],
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((f) => ({ ...f, [key]: e.target.value })),
        'aria-invalid': !!errors[key],
        'aria-describedby': errors[key] ? `${key}-error` : undefined,
    });

    const inputClass = (hasError: boolean) =>
        `w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] border ${hasError ? 'border-[var(--danger)]' : 'border-transparent'}`;

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5"
            aria-label="Create your profile"
        >
            {/* Name */}
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                >
                    Display name{' '}
                    <span aria-hidden="true" className="text-[var(--danger)]">
                        *
                    </span>
                </label>
                <input
                    id="name"
                    type="text"
                    autoComplete="nickname"
                    maxLength={30}
                    placeholder="How should others call you?"
                    className={inputClass(!!errors.name)}
                    {...field('name')}
                />
                {errors.name && (
                    <p id="name-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">
                        {errors.name}
                    </p>
                )}
            </div>

            {/* Age */}
            <div>
                <label
                    htmlFor="age"
                    className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                >
                    Age{' '}
                    <span aria-hidden="true" className="text-[var(--danger)]">
                        *
                    </span>
                </label>
                <input
                    id="age"
                    type="number"
                    min={MIN_AGE}
                    max={MAX_AGE}
                    placeholder="Your age"
                    className={inputClass(!!errors.age)}
                    {...field('age')}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Must be 13 or older to use ChatApp.
                </p>
                {errors.age && (
                    <p id="age-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">
                        {errors.age}
                    </p>
                )}
            </div>

            {/* Gender */}
            <div>
                <fieldset>
                    <legend className="text-sm font-medium text-[var(--text-primary)] mb-2">
                        Gender{' '}
                        <span aria-hidden="true" className="text-[var(--danger)]">
                            *
                        </span>
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
                                <span className="text-sm text-[var(--text-primary)]">
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>
                    {errors.gender && (
                        <p
                            id="gender-error"
                            role="alert"
                            className="mt-1 text-xs text-[var(--danger)]"
                        >
                            {errors.gender}
                        </p>
                    )}
                </fieldset>
            </div>

            {/* Location */}
            <div>
                <label
                    htmlFor="location"
                    className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                >
                    Location{' '}
                    <span aria-hidden="true" className="text-[var(--danger)]">
                        *
                    </span>
                </label>
                <input
                    id="location"
                    type="text"
                    placeholder="e.g. New York, London, Tokyo..."
                    maxLength={60}
                    className={inputClass(!!errors.location)}
                    {...field('location')}
                />
                {errors.location && (
                    <p
                        id="location-error"
                        role="alert"
                        className="mt-1 text-xs text-[var(--danger)]"
                    >
                        {errors.location}
                    </p>
                )}
            </div>

            {/* Bio (optional) */}
            <div>
                <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                >
                    About me{' '}
                    <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <textarea
                    id="bio"
                    maxLength={160}
                    rows={2}
                    placeholder="Write something about yourself..."
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] border border-transparent resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] text-right mt-1">
                    {form.bio.length}/160
                </p>
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
                        I am 13 or older and I agree to the{' '}
                        <a
                            href="/terms"
                            target="_blank"
                            className="text-[var(--accent)] hover:underline"
                        >
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a
                            href="/privacy-policy"
                            target="_blank"
                            className="text-[var(--accent)] hover:underline"
                        >
                            Privacy Policy
                        </a>
                        .
                    </span>
                </label>
                {errors.consent && (
                    <p
                        id="consent-error"
                        role="alert"
                        className="mt-1 text-xs text-[var(--danger)]"
                    >
                        {errors.consent}
                    </p>
                )}
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
    );
}
