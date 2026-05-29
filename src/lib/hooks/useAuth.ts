import { useEffect, useRef } from 'react';
import { onAuthChange, signInAnonymous, logout } from '@/lib/firebase/auth';
import { setupPresence, setOnline, setOffline } from '@/lib/firebase/rtdb';
import { userDoc } from '@/lib/firebase/firestore';
import { getDoc } from 'firebase/firestore';
import { useAppStore } from '@/store';

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes
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
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isIdleRef = useRef(false);
    const uidRef = useRef<string | null>(null);

    useEffect(() => {
        const resetInactivityTimer = () => {
            if (!uidRef.current) return;

            // If we went idle, come back online on activity
            if (isIdleRef.current) {
                isIdleRef.current = false;
                setOnline(uidRef.current).catch(() => {});
            }

            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(() => {
                if (uidRef.current) {
                    isIdleRef.current = true;
                    setOffline(uidRef.current).catch(() => {});
                }
            }, INACTIVITY_MS);
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                resetInactivityTimer();
            } else {
                // Tab hidden — go idle immediately
                if (uidRef.current && !isIdleRef.current) {
                    isIdleRef.current = true;
                    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
                    setOffline(uidRef.current).catch(() => {});
                }
            }
        };

        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                await user.getIdToken(true).catch(() => {});
                const snap = await getDoc(userDoc(user.uid));
                if (snap.exists()) {
                    const profile = { ...snap.data(), uid: user.uid };
                    setCurrentUser(profile);
                    cleanupPresence.current = setupPresence(user.uid);
                    uidRef.current = user.uid;

                    // Start inactivity tracking
                    ACTIVITY_EVENTS.forEach((evt) =>
                        evt === 'visibilitychange'
                            ? document.addEventListener(evt, handleVisibility, { passive: true })
                            : window.addEventListener(evt, resetInactivityTimer, { passive: true })
                    );
                    resetInactivityTimer();
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
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            ACTIVITY_EVENTS.forEach((evt) =>
                evt === 'visibilitychange'
                    ? document.removeEventListener(evt, handleVisibility)
                    : window.removeEventListener(evt, resetInactivityTimer)
            );
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
