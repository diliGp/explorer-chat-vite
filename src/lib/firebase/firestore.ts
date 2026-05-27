import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore'
import { db } from './client'
import type { UserProfile, Message, DM } from '@/types'

// Typed collection references
export const usersCol = () =>
  collection(db, 'users') as CollectionReference<UserProfile>

export const userDoc = (uid: string) =>
  doc(db, 'users', uid) as DocumentReference<UserProfile>

export const dmsCol = () =>
  collection(db, 'dms') as CollectionReference<DM>

export const dmDoc = (dmId: string) =>
  doc(db, 'dms', dmId) as DocumentReference<DM>

export const messagesCol = (dmId: string) =>
  collection(db, 'dms', dmId, 'messages') as CollectionReference<Omit<Message, 'id'>>

export const messageDoc = (dmId: string, msgId: string) =>
  doc(db, 'dms', dmId, 'messages', msgId) as DocumentReference<Message>

// Query helpers
export const dmsByParticipant = (uid: string) =>
  query(dmsCol(), where('participants', 'array-contains', uid), orderBy('lastMessageAt', 'desc'))

export const recentMessages = (dmId: string, count = 50) =>
  query(messagesCol(dmId), orderBy('createdAt', 'asc'), limit(count))

// DM ID is deterministic: sorted uid pair
export const getDmId = (uid1: string, uid2: string): string =>
  [uid1, uid2].sort().join('_')
