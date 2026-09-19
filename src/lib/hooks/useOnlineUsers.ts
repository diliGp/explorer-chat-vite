import { useEffect, useMemo, useState } from 'react';
import { listenToAllPresence } from '@/lib/firebase/rtdb';
import { fetchUserProfilesByUid } from '@/lib/firebase/firestore';
import { useAppStore } from '@/store';
import type { OnlineUser } from '@/types';

export function useOnlineUsers() {
    // Unfiltered — the effect below never reads `blockedUsers`, so blocking/unblocking
    // never needs to resubscribe the whole presence listener (that used to be a stale
    // closure bug: blockedUsers was captured once at mount and never updated).
    const [rawOnlineUsers, setRawOnlineUsers] = useState<OnlineUser[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = useAppStore((s) => s.currentUser);
    const blockedUsers = useMemo(() => currentUser?.blockedUsers ?? [], [currentUser]);

    const onlineUsers = useMemo(
        () => rawOnlineUsers.filter((u) => !blockedUsers.includes(u.uid)),
        [rawOnlineUsers, blockedUsers]
    );

    useEffect(() => {
        const CACHE_TTL_MS = 60_000; // re-fetch profiles every 60s to pick up avatar/bio changes
        let profileCache: Record<string, OnlineUser> = {};
        let profileFetchedAt: Record<string, number> = {};

        const fallbackTimer = setTimeout(() => setLoading(false), 5000);

        const unsubscribe = listenToAllPresence(async (presenceData) => {
            clearTimeout(fallbackTimer);

            const visibleUids = Object.keys(presenceData).filter((uid) => {
                const p = presenceData[uid];
                return p?.online === true;
            });

            // Fetch profiles not yet cached OR whose cache entry is stale
            const now = Date.now();
            const uncached = visibleUids.filter(
                (uid) => !profileCache[uid] || now - (profileFetchedAt[uid] ?? 0) > CACHE_TTL_MS
            );
            if (uncached.length > 0) {
                try {
                    const profiles = await fetchUserProfilesByUid(uncached);
                    for (const [uid, data] of Object.entries(profiles)) {
                        profileCache[uid] = {
                            uid,
                            name: data.name,
                            gender: data.gender,
                            country: data.country,
                            city: data.city,
                            avatarUrl: data.avatarUrl,
                            bio: data.bio,
                            isOnline: true,
                            lastSeen: presenceData[uid]?.lastSeen ?? Date.now(),
                        };
                        profileFetchedAt[uid] = Date.now();
                    }
                } catch (e: any) {
                    console.error('[useOnlineUsers] Firestore query failed:', e.message);
                }
            }

            // Build list from cache — mark online/offline accurately. Blocked-user
            // filtering happens in the `onlineUsers` memo above, not here.
            const users: OnlineUser[] = visibleUids
                .map((uid) => profileCache[uid])
                .filter(Boolean)
                .map((u) => ({
                    ...u,
                    isOnline: presenceData[u.uid]?.online ?? false,
                    lastSeen: presenceData[u.uid]?.lastSeen ?? u.lastSeen,
                }));

            setRawOnlineUsers(users);
            setLoading(false);
        }, (err) => {
            console.error('[useOnlineUsers] presence listener failed:', err);
            clearTimeout(fallbackTimer);
            setLoading(false);
        });

        return () => {
            clearTimeout(fallbackTimer);
            unsubscribe();
        };
    }, []);

    return { onlineUsers, loading };
}
