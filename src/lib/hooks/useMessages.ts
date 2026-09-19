import { useEffect, useState, useCallback, useRef } from 'react';
import {
    onSnapshot,
    updateDoc,
    doc,
    arrayUnion,
    getDocs,
    writeBatch,
    QueryDocumentSnapshot,
    DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
    recentMessages,
    olderMessages,
    messagesCol,
    messageDoc,
    dmDoc,
} from '@/lib/firebase/firestore';
import { uploadImage, deleteImage } from '@/lib/firebase/storage';
import type { Message, ReplyTo, MessageType } from '@/types';

const INITIAL_PAGE = 50;
const OLDER_PAGE = 50;

/** Max consecutive messages an anonymous (non-permanent) sender can send before
 *  the other participant must reply. */
const ANON_CONSECUTIVE_LIMIT = 2;

export class RateLimitError extends Error {
    readonly code = 'rate-limit';
    constructor() {
        super('Wait for a reply before sending more messages.');
    }
}

export function useMessages(
    dmId: string,
    currentUid: string,
    currentName: string,
    isPermanent: boolean,
    // Last-known DM rate-limit state, from the caller's own real-time dm doc
    // subscription (Dm.tsx already has one). Passed as primitives rather than
    // the whole DM object so this hook's callbacks don't get a new identity on
    // every unrelated field change in that doc.
    lastSenderId: string,
    consecutiveSenderCount: number,
    bothReplied: boolean
) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // id -> message. The live "tail" listener below only ever ADDs/MODIFIEs into
    // this map — it never removes on its own, because a limit() query evicting a
    // doc from its result window (a 'removed' docChange) does NOT mean the doc was
    // deleted from Firestore. Real bulk deletes (clearChat) clear this map explicitly.
    const messagesMapRef = useRef<Map<string, Message>>(new Map());
    // Oldest QueryDocumentSnapshot we've loaded so far — the cursor for "load older".
    // Only ever moves further back in time, via loadOlderMessages(); the live tail
    // listener never rewinds it, so it's immune to limit()-window eviction.
    const oldestDocRef = useRef<QueryDocumentSnapshot | null>(null);

    const flushMessages = useCallback(() => {
        const arr = Array.from(messagesMapRef.current.values()).sort(
            (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)
        );
        setMessages(arr);
    }, []);

    useEffect(() => {
        if (!dmId) return;
        messagesMapRef.current = new Map();
        oldestDocRef.current = null;
        setMessages([]);
        setHasMore(false);
        setLoading(true);
        setError(null);

        const q = recentMessages(dmId, INITIAL_PAGE);
        let firstSnapshot = true;
        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                if (firstSnapshot) {
                    firstSnapshot = false;
                    // snap.docs is newest-first; the last entry is the oldest in this page.
                    if (snap.docs.length > 0) {
                        oldestDocRef.current = snap.docs[snap.docs.length - 1];
                    }
                    setHasMore(snap.docs.length === INITIAL_PAGE);
                    snap.docs.forEach((d) => {
                        messagesMapRef.current.set(d.id, { ...d.data(), id: d.id } as Message);
                    });
                } else {
                    // Subsequent snapshots: only apply additions/edits. Ignore 'removed' —
                    // it just means the doc scrolled out of the top-N tail window.
                    for (const change of snap.docChanges()) {
                        if (change.type === 'removed') continue;
                        messagesMapRef.current.set(change.doc.id, {
                            ...change.doc.data(),
                            id: change.doc.id,
                        } as Message);
                    }
                }
                flushMessages();
                setLoading(false);
            },
            (err) => {
                console.error('[useMessages] live listener failed:', err);
                setError(err);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, [dmId, flushMessages]);

    // Synchronous re-entrancy guard: setLoadingOlder(true) doesn't take effect
    // until the next render, so a rapid double-click (or double-tap) could pass
    // the `loadingOlder` state check twice before either commits. A ref flips
    // immediately, so the second call is rejected right away.
    const loadingOlderRef = useRef(false);

    /** Fetches the next page of older history. No-op if already loading or exhausted. */
    const loadOlderMessages = useCallback(async () => {
        if (!dmId || loadingOlderRef.current || !hasMore || !oldestDocRef.current) return;
        loadingOlderRef.current = true;
        setLoadingOlder(true);
        try {
            const snap = await getDocs(olderMessages(dmId, oldestDocRef.current, OLDER_PAGE));
            snap.docs.forEach((d) => {
                messagesMapRef.current.set(d.id, { ...d.data(), id: d.id } as Message);
            });
            if (snap.docs.length > 0) {
                oldestDocRef.current = snap.docs[snap.docs.length - 1];
            }
            setHasMore(snap.docs.length === OLDER_PAGE);
            flushMessages();
        } catch (err) {
            console.error('[useMessages] loadOlderMessages failed:', err);
        } finally {
            loadingOlderRef.current = false;
            setLoadingOlder(false);
        }
    }, [dmId, hasMore, flushMessages]);

    /**
     * Atomically writes a new message + the DM's rate-limit metadata via a
     * writeBatch — NOT a transaction. This is the whole speed fix: a
     * runTransaction() must first read the DM doc from the server (no local
     * cache allowed, since the callback might be retried), so nothing can
     * render until that round-trip finishes. A writeBatch has no such read —
     * both writes apply to the local cache the instant commit() is called, so
     * the message appears via the onSnapshot listener above immediately, well
     * before the server round-trip that commit()'s promise is waiting on.
     *
     * The transition applied (nextCount / nowUnlocked) mirrors exactly what
     * firestore.rules' dmSendMetadataUpdateIsValid() validates server-side —
     * that rule is the actual enforcement of the anon rate limit; this is a
     * client-side prediction of it, computed from the caller's last-known
     * real-time DM state rather than a fresh read. If that cached state is
     * stale (e.g. a second tab just sent a message we haven't heard about
     * yet), the rule rejects the write and we remap the resulting
     * permission-denied into the same RateLimitError this used to throw
     * proactively — so correctness doesn't depend on the cache being fresh,
     * only the UX does.
     *
     * Using one batch (not two independent writes) also means the message
     * and the DM metadata update succeed or fail together — no risk of a
     * delivered message whose DM doc update got rejected, which would freeze
     * `lastMessageAt`/`consecutiveSenderCount` and break both recent-chats
     * ordering and the rate limit for that DM.
     */
    const commitMessage = useCallback(
        async (
            newMsgRef: DocumentReference,
            messageData: Omit<Message, 'id'>,
            preview: string
        ): Promise<void> => {
            const dmRef = dmDoc(dmId);
            const isSameSenderAsBefore = lastSenderId === currentUid;
            const alreadyUnlocked = isPermanent || bothReplied;

            if (
                !alreadyUnlocked &&
                isSameSenderAsBefore &&
                consecutiveSenderCount >= ANON_CONSECUTIVE_LIMIT
            ) {
                throw new RateLimitError();
            }

            const nextCount = isPermanent
                ? 1 // permanent users always unlock the DM (matches prior sendDirect behavior)
                : isSameSenderAsBefore
                  ? consecutiveSenderCount + 1
                  : 1;
            const nowUnlocked =
                alreadyUnlocked || (!isSameSenderAsBefore && lastSenderId !== '');

            const batch = writeBatch(db);
            batch.set(newMsgRef, messageData);
            batch.update(dmRef, {
                lastMessageAt: messageData.createdAt,
                lastMessagePreview: preview,
                lastSenderId: currentUid,
                consecutiveSenderCount: nextCount,
                ...(nowUnlocked && !bothReplied ? { bothReplied: true } : {}),
            });

            try {
                await batch.commit();
            } catch (err: any) {
                if (err?.code === 'permission-denied') throw new RateLimitError();
                throw err;
            }
        },
        [dmId, currentUid, isPermanent, lastSenderId, consecutiveSenderCount, bothReplied]
    );

    const sendText = useCallback(
        async (text: string, replyTo?: ReplyTo) => {
            if (!text.trim()) return;
            const newMsgRef = doc(messagesCol(dmId));
            const messageData: Omit<Message, 'id'> = {
                dmId,
                senderId: currentUid,
                senderName: currentName,
                type: 'text' as MessageType,
                text: text.trim(),
                mediaViewed: false,
                ...(replyTo ? { replyTo } : {}),
                createdAt: Date.now(),
                reportedBy: [],
            };
            await commitMessage(newMsgRef, messageData, text.trim().slice(0, 60));
        },
        [dmId, currentUid, currentName, commitMessage]
    );

    const sendGif = useCallback(
        async (gifUrl: string, replyTo?: ReplyTo) => {
            const newMsgRef = doc(messagesCol(dmId));
            const messageData: Omit<Message, 'id'> = {
                dmId,
                senderId: currentUid,
                senderName: currentName,
                type: 'gif' as MessageType,
                gifUrl,
                mediaViewed: false,
                ...(replyTo ? { replyTo } : {}),
                createdAt: Date.now(),
                reportedBy: [],
            };
            await commitMessage(newMsgRef, messageData, '🎬 GIF');
        },
        [dmId, currentUid, currentName, commitMessage]
    );

    const sendImage = useCallback(
        async (file: File, replyTo?: ReplyTo) => {
            const newMsgRef = doc(messagesCol(dmId));
            const now = Date.now();

            const messageData: Omit<Message, 'id'> = {
                dmId,
                senderId: currentUid,
                senderName: currentName,
                type: 'image' as MessageType,
                mediaViewed: false,
                mediaThumbnail: '',
                mediaRef: '',
                ...(replyTo ? { replyTo } : {}),
                createdAt: now,
                reportedBy: [],
            };

            await commitMessage(newMsgRef, messageData, '📷 Image');

            // Upload and patch after the message doc already exists — the bubble
            // shows a placeholder/spinner until this resolves (see ImageMessage.tsx).
            const { path, thumbnail } = await uploadImage(dmId, newMsgRef.id, file);
            await updateDoc(newMsgRef, { mediaRef: path, mediaThumbnail: thumbnail });
        },
        [dmId, currentUid, currentName, commitMessage]
    );

    const viewImage = useCallback(
        async (message: Message): Promise<string | null> => {
            if (!message.mediaRef) return null;
            if (message.mediaViewed) return null;

            await updateDoc(messageDoc(dmId, message.id), {
                mediaViewed: true,
                mediaRef: null,
            });

            try {
                const { getImageUrl } = await import('@/lib/firebase/storage');
                const url = await getImageUrl(message.mediaRef);
                setTimeout(() => deleteImage(message.mediaRef!), 5000);
                return url;
            } catch {
                await deleteImage(message.mediaRef);
                return null;
            }
        },
        [dmId]
    );

    const reportMessage = useCallback(
        async (msgId: string, reporterUid: string) => {
            // isReported is a separate indexed flag — Firestore can't query
            // "array is non-empty" directly, so the /admin/reports view queries
            // on this instead of reportedBy. Both are set together so they never
            // drift out of sync from this call site.
            await updateDoc(messageDoc(dmId, msgId), {
                reportedBy: arrayUnion(reporterUid),
                isReported: true,
            });
        },
        [dmId]
    );

    const deleteMessage = useCallback(
        async (msgId: string) => {
            await updateDoc(messageDoc(dmId, msgId), {
                deletedAt: Date.now(),
                text: null,
                mediaRef: null,
                gifUrl: null,
            });
        },
        [dmId]
    );

    /**
     * Hard-deletes all messages for both participants.
     * Deletes in batches of 500 (Firestore limit), then resets DM metadata.
     * Best-effort Storage cleanup runs in the background.
     *
     * Known gap: commitMessage()'s rate-limit precheck uses the caller's
     * last-known real-time `consecutiveSenderCount`/`lastSenderId` (passed in as
     * props), not a fresh read. Right after clearChat() resets those server-side,
     * there's a brief window — until the dm doc's onSnapshot round-trips back to
     * the caller — where an anon sender at the limit who immediately sends again
     * can get a spurious client-side RateLimitError before the caller's cached
     * state catches up. The old transaction-based path always read fresh state,
     * so it didn't have this window; trading that for the instant-send win
     * elsewhere means accepting it here. Harmless — the user just retries.
     */
    const clearChat = useCallback(async () => {
        const snap = await getDocs(messagesCol(dmId));
        const docs = snap.docs;

        // Best-effort: delete any view-once images from Storage
        (async () => {
            for (const d of docs) {
                const data = d.data() as any;
                if (data.mediaRef) {
                    await deleteImage(data.mediaRef).catch(() => {});
                }
            }
        })();

        // Delete messages in batches of 500
        for (let i = 0; i < docs.length; i += 500) {
            const batch = writeBatch(db);
            for (const d of docs.slice(i, i + 500)) {
                batch.delete(d.ref);
            }
            await batch.commit();
        }

        // Reset DM metadata so both parties' UI updates instantly via onSnapshot
        await updateDoc(dmDoc(dmId), {
            lastMessageAt: Date.now(),
            lastMessagePreview: '',
            lastSenderId: '',
            consecutiveSenderCount: 0,
        });

        // Reset local state directly rather than relying on the live listener's
        // 'removed' docChanges — those are ignored on purpose (see effect above),
        // since they normally just mean "scrolled out of the tail window", not deleted.
        messagesMapRef.current = new Map();
        oldestDocRef.current = null;
        setHasMore(false);
        flushMessages();
    }, [dmId, flushMessages]);

    return {
        messages,
        loading,
        loadingOlder,
        hasMore,
        loadOlderMessages,
        error,
        sendText,
        sendGif,
        sendImage,
        viewImage,
        reportMessage,
        deleteMessage,
        clearChat,
    };
}
