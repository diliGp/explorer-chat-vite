import { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { dmsByParticipant, fetchUserProfilesByUid } from '@/lib/firebase/firestore';
import { useAppStore } from '@/store';
import type { DM, OnlineUser } from '@/types';

export interface RecentChat {
    dm: DM;
    otherUser: OnlineUser;
    unreadCount: number;
}

export function useRecentChats(currentUid: string) {
    // Unfiltered — kept out of the effect below so blocking/unblocking someone
    // takes effect immediately without resubscribing the DM listener (the effect
    // has an empty-ish dep array and would otherwise close over a stale value).
    const [rawRecentChats, setRawRecentChats] = useState<RecentChat[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = useAppStore((s) => s.currentUser);
    const blockedUsers = useMemo(() => currentUser?.blockedUsers ?? [], [currentUser]);

    const recentChats = useMemo(
        () => rawRecentChats.filter((c) => !blockedUsers.includes(c.otherUser.uid)),
        [rawRecentChats, blockedUsers]
    );

    useEffect(() => {
        if (!currentUid) return;

        const profileCache: Record<string, OnlineUser> = {};

        const fetchProfiles = async (uids: string[]) => {
            const uncached = uids.filter((uid) => !profileCache[uid]);
            if (uncached.length === 0) return;

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
                        isOnline: false,
                        lastSeen: 0,
                    };
                }
            } catch (e: any) {
                console.error('[useRecentChats] profile fetch failed:', e.message);
            }
        };

        const unsub = onSnapshot(dmsByParticipant(currentUid), async (snap) => {
            const dms: DM[] = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as DM);

            // Collect all other participant uids
            const otherUids = dms
                .map((dm) => dm.participants.find((p) => p !== currentUid))
                .filter(Boolean) as string[];

            await fetchProfiles(otherUids);

            const chats: RecentChat[] = dms
                .filter((dm) => dm.participants.some((p) => p !== currentUid))
                .map((dm) => {
                    const otherUid = dm.participants.find((p) => p !== currentUid) ?? '';
                    const lastRead = dm.lastReadAt?.[currentUid] ?? 0;
                    const unreadCount =
                        dm.lastSenderId !== currentUid && dm.lastMessageAt > lastRead ? 1 : 0;

                    return {
                        dm,
                        otherUser: profileCache[otherUid] ?? {
                            uid: otherUid,
                            name: dm.participantNames?.[otherUid] ?? 'User',
                            gender: dm.participantGenders?.[otherUid] ?? 'other',
                            country: dm.participantCountries?.[otherUid] ?? 'US',
                            isOnline: false,
                            lastSeen: 0,
                        },
                        unreadCount,
                    };
                });

            setRawRecentChats(chats);
            setLoading(false);
        }, (err) => {
            console.error('[useRecentChats] listener failed:', err);
            setLoading(false);
        });

        return unsub;
    }, [currentUid]);

    return { recentChats, loading };
}
