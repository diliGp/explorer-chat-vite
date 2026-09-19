import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { onAuthChange, signInAnonymous, logout, signOutPreservingData } from '@/lib/firebase/auth';
import { setupPresence, setOnline, setOffline } from '@/lib/firebase/rtdb';
import { userDoc } from '@/lib/firebase/firestore';
import { getDoc } from 'firebase/firestore';
import { useAppStore } from '@/store';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

const DEFAULT_INACTIVITY_MINUTES = 5;
const ACTIVITY_EVENTS = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'visibilitychange',
];

// Module-level flag: prevents re-sign-in after intentional account deletion
let _intentionalDelete = false;

export function useAuth() {
    const { currentUser, setCurrentUser, setAuthReady } = useAppStore();
    const initialized = useRef(false);
    const cleanupPresence = useRef<(() => void) | null>(null);

    // navigate()'s identity is stable in React Router v6+/v7, but this is read
    // from inside a setTimeout callback registered in an effect with an empty
    // dep array (see below) — a ref avoids depending on that stability holding
    // forever, and avoids adding `navigate` to that effect's deps (which would
    // resubscribe onAuthChange and re-run setupPresence if it ever weren't).
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    // Configurable via Firebase Console (config/featureFlags.inactivityLogoutMinutes)
    // — see useFeatureFlags.ts. Read into a ref for the same reason as above:
    // the activity-listener effect keys on currentUser?.uid, not on this value,
    // so a config change takes effect on the next timer reset rather than
    // requiring a full listener teardown/rebuild.
    const { inactivityLogoutMinutes } = useFeatureFlags();
    const logoutMsRef = useRef(DEFAULT_INACTIVITY_MINUTES * 60_000);
    useEffect(() => {
        logoutMsRef.current = inactivityLogoutMinutes * 60_000;
    }, [inactivityLogoutMinutes]);

    // ── Auth lifecycle: sign-in/sign-out, loading the profile doc ───────────
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                await user.getIdToken(true).catch(() => {});
                const snap = await getDoc(userDoc(user.uid));
                if (snap.exists()) {
                    const profile = { ...snap.data(), uid: user.uid };
                    setCurrentUser(profile);
                    cleanupPresence.current = setupPresence(user.uid);
                } else if (!initialized.current) {
                    setCurrentUser(null);
                }
                initialized.current = true;
                setAuthReady(true);
            } else {
                if (!_intentionalDelete) {
                    try {
                        await signInAnonymous();
                    } catch (e) {
                        console.error('Anonymous sign-in failed', e);
                    }
                }
            }
        });

        return () => {
            unsubscribe();
            cleanupPresence.current?.();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Activity tracking: presence-idle marking + inactivity auto-logout ──
    // Keyed on currentUser?.uid rather than living inside the onAuthChange
    // callback above. That matters: a freshly-onboarded user gets their
    // profile via ProfileForm.tsx calling setCurrentUser()/setupPresence()
    // directly (no new auth event fires — it's the same anon uid, only the
    // Firestore doc changed), so anything wired up only inside onAuthChange's
    // "profile exists" branch would never activate for that session until a
    // page reload. Reacting to currentUser?.uid instead covers both paths, and
    // as a side effect also fixes a listener leak this used to have on
    // re-auth (e.g. anon->permanent upgrade): this effect's cleanup now
    // properly detaches the old uid's listeners before the new uid's attach.
    useEffect(() => {
        const uid = currentUser?.uid;
        if (!uid) return;

        let isIdle = false;
        let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
        let logoutTimer: ReturnType<typeof setTimeout> | null = null;

        const resetInactivityTimer = () => {
            // If we went idle, come back online on activity
            if (isIdle) {
                isIdle = false;
                setOnline(uid).catch(() => {});
            }
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                isIdle = true;
                setOffline(uid).catch(() => {});
            }, DEFAULT_INACTIVITY_MINUTES * 60_000);
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                resetInactivityTimer();
            } else {
                // Tab hidden — go idle immediately (presence indicator only;
                // does NOT touch the logout countdown, see below).
                if (!isIdle) {
                    isIdle = true;
                    if (inactivityTimer) clearTimeout(inactivityTimer);
                    setOffline(uid).catch(() => {});
                }
            }
        };

        // Session-ending logout — deliberately a separate timer/mechanism from
        // the presence one above, and NOT reset or paused by tab-hide:
        // backgrounding the tab is itself a form of inactivity, so this
        // countdown keeps running regardless of visibility. It's only reset by
        // genuine activity events (and by the tab becoming visible again,
        // which counts as activity).
        const handleInactivityLogout = async () => {
            toast('You were signed out after being inactive.', { icon: '⏳' });
            setCurrentUser(null);
            try {
                await setOffline(uid);
            } catch {
                // Best-effort — we're logging out regardless.
            }
            try {
                // Preserves data — see signOutPreservingData()'s doc comment
                // for why this must never be logout()'s deleteAnonUser() path.
                await signOutPreservingData();
            } catch (e) {
                console.error('[useAuth] inactivity sign-out failed:', e);
            }
            navigateRef.current('/onboarding');
        };

        const resetLogoutTimer = () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            if (logoutMsRef.current <= 0) return; // <= 0 disables auto-logout
            logoutTimer = setTimeout(handleInactivityLogout, logoutMsRef.current);
        };

        const handleVisibilityForLogout = () => {
            if (document.visibilityState === 'visible') resetLogoutTimer();
            // else: leave the countdown running while hidden — see comment above.
        };

        for (const evt of ACTIVITY_EVENTS) {
            if (evt === 'visibilitychange') {
                document.addEventListener(evt, handleVisibility, { passive: true });
                document.addEventListener(evt, handleVisibilityForLogout, { passive: true });
            } else {
                window.addEventListener(evt, resetInactivityTimer, { passive: true });
                window.addEventListener(evt, resetLogoutTimer, { passive: true });
            }
        }
        resetInactivityTimer();
        resetLogoutTimer();

        return () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            if (logoutTimer) clearTimeout(logoutTimer);
            for (const evt of ACTIVITY_EVENTS) {
                if (evt === 'visibilitychange') {
                    document.removeEventListener(evt, handleVisibility);
                    document.removeEventListener(evt, handleVisibilityForLogout);
                } else {
                    window.removeEventListener(evt, resetInactivityTimer);
                    window.removeEventListener(evt, resetLogoutTimer);
                }
            }
        };
    }, [currentUser?.uid, setCurrentUser]);

    return { currentUser };
}

/**
 * Call this from UI sign-out buttons.
 * For anonymous users: runs full data cleanup before deleting the account.
 * For permanent users: regular sign-out.
 */
export async function handleLogout(
    isPermanent: boolean,
    uid: string,
    setCurrentUser: (u: null) => void
) {
    setCurrentUser(null);
    if (!isPermanent) {
        _intentionalDelete = true;
    }
    await logout(!isPermanent, uid);
}
