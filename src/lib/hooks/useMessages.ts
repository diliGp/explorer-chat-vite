'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  onSnapshot,
  addDoc,
  updateDoc,
  runTransaction,
  doc,
  arrayUnion,
  getDocs,
  writeBatch,
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
   * Fast path for permanent users: fire-and-forget two independent writes.
   * No round-trip read needed — skips transaction overhead entirely.
   */
  const sendDirect = useCallback(
    async (messageData: Omit<Message, 'id'>, preview: string): Promise<void> => {
      const dmRef = dmDoc(dmId)
      const msgsColRef = messagesCol(dmId)
      const newMsgRef = doc(msgsColRef)
      // Both writes in parallel — message appears instantly via onSnapshot
      await Promise.all([
        updateDoc(dmRef, {
          lastMessageAt: messageData.createdAt,
          lastMessagePreview: preview,
          lastSenderId: currentUid,
          consecutiveSenderCount: 1,
          bothReplied: true, // permanent users always unlock the DM
        }),
        addDoc(msgsColRef, messageData),
      ])
    },
    [dmId, currentUid]
  )

  /**
   * Transaction path for anonymous users: read → check consecutive limit → write.
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
        const lastSenderId: string = dm.lastSenderId ?? ''
        const consecutiveCount: number = dm.consecutiveSenderCount ?? 0
        const bothReplied: boolean = dm.bothReplied ?? false

        // Only enforce limit if chat hasn't become two-way yet
        if (!bothReplied && lastSenderId === currentUid && consecutiveCount >= ANON_CONSECUTIVE_LIMIT) {
          throw new RateLimitError()
        }

        const newMsgRef = doc(msgsColRef)
        tx.set(newMsgRef, messageData)

        const isSameAsBefore = lastSenderId === currentUid
        // Mark bothReplied the moment a different sender responds
        const nowBothReplied = bothReplied || (!isSameAsBefore && lastSenderId !== '')

        tx.update(dmRef, {
          lastMessageAt: messageData.createdAt,
          lastMessagePreview: preview,
          lastSenderId: currentUid,
          consecutiveSenderCount: isSameAsBefore ? consecutiveCount + 1 : 1,
          ...(nowBothReplied && !bothReplied ? { bothReplied: true } : {}),
        })
      })
    },
    [dmId, currentUid]
  )

  const send = useCallback(
    (messageData: Omit<Message, 'id'>, preview: string) =>
      isPermanent
        ? sendDirect(messageData, preview)
        : sendWithTransaction(messageData, preview),
    [isPermanent, sendDirect, sendWithTransaction]
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
      await send(messageData, text.trim().slice(0, 60))
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
      await send(messageData, '🎬 GIF')
    },
    [dmId, currentUid, currentName, send]
  )

  const sendImage = useCallback(
    async (file: File, replyTo?: ReplyTo) => {
      const msgsColRef = messagesCol(dmId)
      const dmRef = dmDoc(dmId)
      const newMsgRef = doc(msgsColRef)
      const now = Date.now()

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
      }

      if (isPermanent) {
        // Fast path: no transaction needed
        await Promise.all([
          updateDoc(dmRef, {
            lastMessageAt: now,
            lastMessagePreview: '📷 Image',
            lastSenderId: currentUid,
            consecutiveSenderCount: 1,
          }),
          import('firebase/firestore').then(({ setDoc }) => setDoc(newMsgRef, messageData)),
        ])
      } else {
        await runTransaction(db, async (tx) => {
          const dmSnap = await tx.get(dmRef)
          if (!dmSnap.exists()) throw new Error('DM not found')
          const dm = dmSnap.data() as any
          const lastSenderId: string = dm.lastSenderId ?? ''
          const consecutiveCount: number = dm.consecutiveSenderCount ?? 0
          if (lastSenderId === currentUid && consecutiveCount >= ANON_CONSECUTIVE_LIMIT) {
            throw new RateLimitError()
          }
          tx.set(newMsgRef, messageData)
          tx.update(dmRef, {
            lastMessageAt: now,
            lastMessagePreview: '📷 Image',
            lastSenderId: currentUid,
            consecutiveSenderCount: lastSenderId === currentUid ? consecutiveCount + 1 : 1,
          })
        })
      }

      // Upload and patch after write
      const { path, thumbnail } = await uploadImage(dmId, newMsgRef.id, file)
      await updateDoc(newMsgRef, { mediaRef: path, mediaThumbnail: thumbnail })
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
