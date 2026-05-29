import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags'
import { useAppStore } from '@/store'

interface AdSlotProps {
    id: string
    width: number
    height: number
    className?: string
    label?: string
}

/**
 * Placeholder ad slot — replace inner content with
 * <ins className="adsbygoogle" ...> when AdSense is approved.
 * Fixed dimensions prevent layout shift (CLS).
 *
 * Visibility is controlled by `config/featureFlags` in Firestore (live, no redeploy needed):
 *   - `showAds: false`           → hidden for everyone
 *   - `adsAllowlist: ["uid1"]`   → visible only to listed UIDs
 *   - `adsDenylist: ["uid2"]`    → hidden for listed UIDs even if globally on
 */
export function AdSlot({ id, width, height, className = '', label = 'Advertisement' }: AdSlotProps) {
    const currentUser = useAppStore((s) => s.currentUser)
    const { showAds } = useFeatureFlags(currentUser?.uid)

    if (!showAds) return null

    return (
        <div
            id={`ad-${id}`}
            aria-label={label}
            aria-hidden="true"
            className={`ad-slot ${className}`}
            style={{ width, height, minWidth: width, minHeight: height }}
        >
            <span>{label}</span>
        </div>
    )
}
