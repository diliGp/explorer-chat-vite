'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  onSnapshot,
  addDoc,
  updateDoc,
  runTransaction,
  doc,
  collection,
  arrayUnion,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { recentMessages, messagesCol, messageDoc, dmDoc } from '@/lib/firebase/firestore'
import { uploadImage, deleteImage } from '@/lib/firebase/storage'
import type { Message, ReplyTo, MessageType } from '@/types'

/** Max consecutive messages an anonymous (non-permanent) sender can send before
 *  the other participant must reply. */
const ANON_CONSECUTIVE_LIMIT = 2

export class RateLimitError extends Error {
  readonly code = 'rate-limit'
  constructor() {
    super('Wait for a reply before sending more messages.')
  }
}

export function useMessages(
  dmId: string,
  currentUid: string,
  currentName: string,
  isPermanent: boolean
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dmId) return
    const q = recentMessages(dmId)
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs: Message[] = []
      snap.forEach((d) => {
        msgs.push({ ...d.data(), id: d.id } as Message)
      })
      setMessages(msgs)
      setLoading(false)
    })
    return unsubscribe
  }, [dmId])

  /**
   * Atomically checks the consecutive-send limit for anonymous users,
   * writes the message, and updates DM metadata in a single transaction.
   */
  const sendWithTransaction = useCallback(
    async (
      messageData: Omit<Message, 'id'>,
      preview: string
    ): Promise<void> => {
      const dmRef = dmDoc(dmId)
      const msgsColRef = messagesCol(dmId)

      await runTransaction(db, async (tx) => {
        const dmSnap = await tx.get(dmRef)
        if (!dmSnap.exists()) throw new Error('DM not found')

        const dm = dmSnap.data() as any

        // ── Consecutive-send check (anonymous senders only) ─────────────────
        if (!isPermanent) {
          const lastSenderId: string = dm.lastSenderId ?? ''
          const consecutiveCount: number = dm.consecutiveSenderCount ?? 0
          if (
            lastSenderId === currentUid &&
            consecutiveCount >= ANON_CONSECUTIVE_LIMIT
          ) {
            throw new RateLimitError()
          }
        }

        // ── Write message ────────────────────────────────────────────────────
        const newMsgRef = doc(msgsColRef)
        tx.set(newMsgRef, messageData)

        // ── Update DM metadata ───────────────────────────────────────────────
        const isSameAsBefore = (dm.lastSenderId ?? '') === currentUid
        tx.update(dmRef, {
          lastMessageAt: messageData.createdAt,
          lastMessagePreview: preview,
          lastSenderId: currentUid,
          consecutiveSenderCount: isSameAsBefore
            ? (dm.consecutiveSenderCount ?? 0) + 1
            : 1,
        })
      })
    },
    [dmId, currentUid, isPermanent]
  )

  const sendText = useCallback(
    async (text: string, replyTo?: ReplyTo) => {
      if (!text.trim()) return
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
      }
      await sendWithTransaction(messageData, text.trim().slice(0, 60))
    },
    [dmId, currentUid, currentName, sendWithTransaction]
  )

  const sendGif = useCallback(
    async (gifUrl: string, replyTo?: ReplyTo) => {
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
      }
      await sendWithTransaction(messageData, '🎬 GIF')
    },
    [dmId, currentUid, currentName, sendWithTransaction]
  )

  const sendImage = useCallback(
    async (file: File, replyTo?: ReplyTo) => {
      // We need the doc ID before the transaction for the storage path,
      // so we create the message ref outside, then use the transaction only
      // for the limit check + DM metadata update.
      const msgsColRef = messagesCol(dmId)
      const dmRef = dmDoc(dmId)

      // Pre-allocate a doc reference so we know the msgId for storage upload
      const newMsgRef = doc(msgsColRef)

      // Check limit in a transaction, write placeholder, update DM
      await runTransaction(db, async (tx) => {
        const dmSnap = await tx.get(dmRef)
        if (!dmSnap.exists()) throw new Error('DM not found')

        const dm = dmSnap.data() as any

        if (!isPermanent) {
          const lastSenderId: string = dm.lastSenderId ?? ''
          const consecutiveCount: number = dm.consecutiveSenderCount ?? 0
          if (
            lastSenderId === currentUid &&
            consecutiveCount >= ANON_CONSECUTIVE_LIMIT
          ) {
            throw new RateLimitError()
          }
        }

        const messageData: Omit<Message, 'id'> = {
          dmId,
          senderId: currentUid,
          senderName: currentName,
          type: 'image' as MessageType,
          mediaViewed: false,
          mediaThumbnail: '',
          mediaRef: '',
          ...(replyTo ? { replyTo } : {}),
          createdAt: Date.now(),
          reportedBy: [],
        }

        tx.set(newMsgRef, messageData)

        const isSameAsBefore = (dm.lastSenderId ?? '') === currentUid
        tx.update(dmRef, {
          lastMessageAt: messageData.createdAt,
          lastMessagePreview: '📷 Image',
          lastSenderId: currentUid,
          consecutiveSenderCount: isSameAsBefore
            ? (dm.consecutiveSenderCount ?? 0) + 1
            : 1,
        })
      })

      // Upload and patch the message after the transaction commits
      const { path, thumbnail } = await uploadImage(dmId, newMsgRef.id, file)
      await updateDoc(newMsgRef, {
        mediaRef: path,
        mediaThumbnail: thumbnail,
      })
    },
    [dmId, currentUid, currentName, isPermanent]
  )

  const viewImage = useCallback(
    async (message: Message): Promise<string | null> => {
      if (!message.mediaRef) return null
      if (message.mediaViewed) return null

      await updateDoc(messageDoc(dmId, message.id), {
        mediaViewed: true,
        mediaRef: null,
      })

      try {
        const { getImageUrl } = await import('@/lib/firebase/storage')
        const url = await getImageUrl(message.mediaRef)
        setTimeout(() => deleteImage(message.mediaRef!), 5000)
        return url
      } catch {
        await deleteImage(message.mediaRef)
        return null
      }
    },
    [dmId]
  )

  const reportMessage = useCallback(
    async (msgId: string, reporterUid: string) => {
      await updateDoc(messageDoc(dmId, msgId), {
        reportedBy: arrayUnion(reporterUid),
      })
    },
    [dmId]
  )

  const deleteMessage = useCallback(
    async (msgId: string) => {
      await updateDoc(messageDoc(dmId, msgId), {
        deletedAt: Date.now(),
        text: null,
        mediaRef: null,
        gifUrl: null,
      })
    },
    [dmId]
  )

  /**
   * Hard-deletes all messages for both participants.
   * Deletes in batches of 500 (Firestore limit), then resets DM metadata.
   * Best-effort Storage cleanup runs in the background.
   */
  const clearChat = useCallback(async () => {
    const snap = await getDocs(messagesCol(dmId))
    const docs = snap.docs

    // Best-effort: delete any view-once images from Storage
    ;(async () => {
      for (const d of docs) {
        const data = d.data() as any
        if (data.mediaRef) {
          await deleteImage(data.mediaRef).catch(() => {})
        }
      }
    })()

    // Delete messages in batches of 500
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db)
      for (const d of docs.slice(i, i + 500)) {
        batch.delete(d.ref)
      }
      await batch.commit()
    }

    // Reset DM metadata so both parties' UI updates instantly via onSnapshot
    await updateDoc(dmDoc(dmId), {
      lastMessageAt: Date.now(),
      lastMessagePreview: '',
      lastSenderId: '',
      consecutiveSenderCount: 0,
    })
  }, [dmId])

  return {
    messages,
    loading,
    sendText,
    sendGif,
    sendImage,
    viewImage,
    reportMessage,
    deleteMessage,
    clearChat,
  }
}
