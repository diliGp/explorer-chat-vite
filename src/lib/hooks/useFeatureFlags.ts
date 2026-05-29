import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

export interface FeatureFlags {
    showAds: boolean
    adsAllowlist: string[]
    adsDenylist: string[]
}

const DEFAULTS: FeatureFlags = {
    showAds: true,
    adsAllowlist: [], // empty = show to all users
    adsDenylist: [],  // empty = no one blocked
}

/**
 * Subscribes to the Firestore `config/featureFlags` document in real-time.
 * Evaluates per-user ad visibility based on allowlist/denylist targeting.
 * Any field missing from the doc falls back to DEFAULTS.
 *
 * Firestore doc shape (`config/featureFlags`):
 * ```json
 * {
 *   "showAds": true,          // master on/off switch
 *   "adsAllowlist": [],        // if non-empty, only these UIDs see ads
 *   "adsDenylist": ["uid_x"]  // these UIDs never see ads (overrides allowlist)
 * }
 * ```
 *
 * Targeting precedence:
 *   1. showAds === false → ads off for everyone
 *   2. uid in adsDenylist → ads off for this user
 *   3. adsAllowlist non-empty AND uid not in it → ads off for this user
 *   4. Otherwise → ads on
 *
 * Role/subscription targeting: not yet supported (UserProfile has no role/subscription
 * fields). Add those fields to UserProfile and extend this hook when needed.
 *
 * @param uid - The current user's UID (optional; when absent, only the global toggle applies)
 */
export function useFeatureFlags(uid?: string): { showAds: boolean } {
    const [rawFlags, setRawFlags] = useState<FeatureFlags>(DEFAULTS)

    useEffect(() => {
        const ref = doc(db, 'config', 'featureFlags')
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (snap.exists()) {
                    setRawFlags({ ...DEFAULTS, ...snap.data() } as FeatureFlags)
                } else {
                    setRawFlags(DEFAULTS)
                }
            },
            () => {
                // On permission error or offline: silently fall back to defaults
                setRawFlags(DEFAULTS)
            }
        )
        return unsub
    }, [])

    const showAds = resolveShowAds(rawFlags, uid)
    return { showAds }
}

/**
 * Pure targeting resolver — extracted for testability.
 *
 * Precedence (highest → lowest priority):
 *   1. Global off  → false
 *   2. Denylist hit → false
 *   3. Allowlist non-empty, uid absent or not in it → false
 *   4. Otherwise → true
 */
export function resolveShowAds(flags: FeatureFlags, uid?: string): boolean {
    if (!flags.showAds) return false
    if (uid && flags.adsDenylist.includes(uid)) return false
    if (flags.adsAllowlist.length > 0) {
        if (!uid || !flags.adsAllowlist.includes(uid)) return false
    }
    return true
}
