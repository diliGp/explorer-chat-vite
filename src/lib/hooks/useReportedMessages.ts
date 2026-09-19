import { useEffect, useState } from 'react';
import { collectionGroup, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Message } from '@/types';

/**
 * Real-time collection-group query across every DM's messages subcollection,
 * filtered to reported ones. Access control is entirely firestore.rules'
 * isAdmin() branch on the messages read rule — `enabled` here just avoids
 * firing the query (and eating a permission-denied) for non-admins, it is not
 * itself a security boundary.
 *
 * Known gap: only matches messages reported AFTER isReported was introduced.
 * Messages reported earlier still have `reportedBy` populated but no
 * `isReported` flag, so they won't appear here — no backfill migration has
 * been run for existing data.
 */
export function useReportedMessages(enabled: boolean) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!enabled) {
            setMessages([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collectionGroup(db, 'messages'),
            where('isReported', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Message);
                // Guard against any doc missing dmId (the field used for both the
                // dismiss/delete actions and the /dm/{dmId} link) — shouldn't
                // happen for messages created via useMessages.ts's send paths, but
                // mergeAnonymousData's re-keying touches this field directly, so
                // don't let a malformed doc turn into a broken action in the UI.
                setMessages(docs.filter((m) => !!m.dmId));
                setLoading(false);
            },
            (err) => {
                console.error('[useReportedMessages] listener failed:', err);
                setError(err);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [enabled]);

    return { messages, loading, error };
}
