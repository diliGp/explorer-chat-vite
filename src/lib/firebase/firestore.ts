import {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    documentId,
    CollectionReference,
    DocumentReference,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './client';
import type { UserProfile, Message, DM } from '@/types';

// Typed collection references
export const usersCol = () => collection(db, 'users') as CollectionReference<UserProfile>;

export const userDoc = (uid: string) => doc(db, 'users', uid) as DocumentReference<UserProfile>;

export const dmsCol = () => collection(db, 'dms') as CollectionReference<DM>;

export const dmDoc = (dmId: string) => doc(db, 'dms', dmId) as DocumentReference<DM>;

export const messagesCol = (dmId: string) =>
    collection(db, 'dms', dmId, 'messages') as CollectionReference<Omit<Message, 'id'>>;

export const messageDoc = (dmId: string, msgId: string) =>
    doc(db, 'dms', dmId, 'messages', msgId) as DocumentReference<Message>;

// Query helpers
export const dmsByParticipant = (uid: string) =>
    query(dmsCol(), where('participants', 'array-contains', uid), orderBy('lastMessageAt', 'desc'));

/**
 * Live "tail" window — the most recent `count` messages, newest first.
 * Reverse client-side for ascending display. Because this uses `limit()`,
 * a new incoming message evicts the oldest row from THIS query's result set
 * (a 'removed' docChange) without deleting it from Firestore — callers must
 * not treat that as a deletion (see useMessages.ts).
 */
export const recentMessages = (dmId: string, count = 50) =>
    query(messagesCol(dmId), orderBy('createdAt', 'desc'), limit(count));

/**
 * One-time page of messages strictly older than `cursor` (a QueryDocumentSnapshot
 * from a previous `recentMessages`/`olderMessages` result), newest-of-the-old first.
 * Using a document cursor (not a timestamp comparison) avoids skipping/duplicating
 * messages that share the same `createdAt` millisecond.
 */
export const olderMessages = (dmId: string, cursor: QueryDocumentSnapshot, count = 50) =>
    query(messagesCol(dmId), orderBy('createdAt', 'desc'), startAfter(cursor), limit(count));

// DM ID is deterministic: sorted uid pair
export const getDmId = (uid1: string, uid2: string): string => [uid1, uid2].sort().join('_');

/**
 * Fetches `users/{uid}` docs for an arbitrary list of uids, chunked into
 * Firestore's `in`-query limit of 10 per request. Shared by useOnlineUsers
 * and useRecentChats, which previously duplicated this chunking logic —
 * each hook still owns its own caching strategy (TTL, etc.) around this call.
 */
export async function fetchUserProfilesByUid(
    uids: string[]
): Promise<Record<string, UserProfile>> {
    const result: Record<string, UserProfile> = {};
    const unique = Array.from(new Set(uids)).filter(Boolean);
    if (unique.length === 0) return result;

    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10));

    await Promise.all(
        chunks.map(async (chunk) => {
            const snaps = await getDocs(query(usersCol(), where(documentId(), 'in', chunk)));
            snaps.forEach((snap) => {
                result[snap.id] = { ...snap.data(), uid: snap.id };
            });
        })
    );

    return result;
}
