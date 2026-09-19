import { updateDoc } from 'firebase/firestore';
import { messageDoc } from './firestore';

/**
 * Admin-only actions for the /admin/reports view. These rely entirely on
 * firestore.rules' `isAdmin()` branch on the messages `allow update` rule for
 * access control — there is no client-side gate here beyond the route itself
 * not being linked for non-admins. A non-admin calling these gets a
 * permission-denied from Firestore, same as any other unauthorized write.
 */

/** Clears a report without touching the message content. */
export async function dismissReport(dmId: string, msgId: string): Promise<void> {
    await updateDoc(messageDoc(dmId, msgId), {
        isReported: false,
        reportedBy: [],
    });
}

/**
 * Soft-deletes a reported message (same shape as the sender's own
 * deleteMessage() in useMessages.ts) and clears its report state.
 */
export async function deleteReportedMessage(dmId: string, msgId: string): Promise<void> {
    await updateDoc(messageDoc(dmId, msgId), {
        deletedAt: Date.now(),
        text: null,
        mediaRef: null,
        gifUrl: null,
        isReported: false,
        reportedBy: [],
    });
}
