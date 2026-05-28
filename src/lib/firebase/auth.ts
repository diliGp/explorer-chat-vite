import {
  signInAnonymously,
  linkWithPopup,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  EmailAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth'
import {
  writeBatch,
  getDocs,
  collection,
  query,
  where,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { auth, db } from './client'
import { ref, remove } from 'firebase/database'
import { rtdb } from './client'

export async function signInAnonymous(): Promise<User> {
  const result = await signInAnonymously(auth)
  return result.user
}

export interface UpgradeResult {
  user: User
  /** true when the credential belonged to an existing account that was merged */
  merged: boolean
}

export async function upgradeWithGoogle(): Promise<UpgradeResult> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  const anonUid = auth.currentUser.uid
  const provider = new GoogleAuthProvider()

  try {
    const result = await linkWithPopup(auth.currentUser, provider)
    return { user: result.user, merged: false }
  } catch (err: any) {
    if (err.code !== 'auth/credential-already-in-use') throw err
    // Extract the Google credential from the error and sign into existing account
    const credential = GoogleAuthProvider.credentialFromError(err)
    if (!credential) throw new Error('Could not extract credential from error')
    const result = await signInWithCredential(auth, credential)
    await mergeAnonymousData(anonUid, result.user.uid)
    return { user: result.user, merged: true }
  }
}

export async function upgradeWithEmail(
  email: string,
  password: string
): Promise<UpgradeResult> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  const anonUid = auth.currentUser.uid
  const credential = EmailAuthProvider.credential(email, password)

  try {
    const result = await linkWithCredential(auth.currentUser, credential)
    return { user: result.user, merged: false }
  } catch (err: any) {
    if (
      err.code !== 'auth/credential-already-in-use' &&
      err.code !== 'auth/email-already-in-use'
    ) {
      throw err
    }
    // Sign into the existing email account and merge data
    const result = await signInWithEmailAndPassword(auth, email, password)
    await mergeAnonymousData(anonUid, result.user.uid)
    return { user: result.user, merged: true }
  }
}

/**
 * Re-keys all Firestore data from `anonUid` to `permanentUid`.
 * Called when an anonymous user tries to upgrade but the credential already
 * belongs to an existing account. After this runs the anonymous user's chats,
 * messages, and profile are fully migrated.
 */
async function mergeAnonymousData(
  anonUid: string,
  permanentUid: string
): Promise<void> {
  if (anonUid === permanentUid) return // already the same user, nothing to do

  // 1. Find every DM where the anonymous user is a participant
  const dmsSnap = await getDocs(
    query(
      collection(db, 'dms'),
      where('participants', 'array-contains', anonUid)
    )
  )

  const batch = writeBatch(db)

  for (const dmDoc of dmsSnap.docs) {
    const dm = dmDoc.data() as any

    // Replace anonUid with permanentUid in participants array
    const newParticipants: string[] = dm.participants.map((p: string) =>
      p === anonUid ? permanentUid : p
    )

    // Re-key participantNames map
    const newNames: Record<string, string> = {}
    for (const [uid, name] of Object.entries(dm.participantNames ?? {})) {
      newNames[uid === anonUid ? permanentUid : uid] = name as string
    }

    // Re-key participantGenders map
    const newGenders: Record<string, string> = {}
    for (const [uid, gender] of Object.entries(dm.participantGenders ?? {})) {
      newGenders[uid === anonUid ? permanentUid : uid] = gender as string
    }

    // Re-key participantCountries map
    const newCountries: Record<string, string> = {}
    for (const [uid, country] of Object.entries(
      dm.participantCountries ?? {}
    )) {
      newCountries[uid === anonUid ? permanentUid : uid] = country as string
    }

    // DM ID is deterministic (sorted uid pair) — compute the new ID
    const newDmId = [...newParticipants].sort().join('_')
    const oldDmId = dmDoc.id

    if (newDmId !== oldDmId) {
      // New DM doc under the correct ID
      const newDmRef = doc(db, 'dms', newDmId)
      batch.set(newDmRef, {
        ...dm,
        participants: newParticipants,
        participantNames: newNames,
        participantGenders: newGenders,
        participantCountries: newCountries,
      })
      // Mark old DM for deletion (handled after batch commit — see below)
    } else {
      // Same ID, just update the maps in place
      batch.update(dmDoc.ref, {
        participants: newParticipants,
        participantNames: newNames,
        participantGenders: newGenders,
        participantCountries: newCountries,
      })
    }

    // Re-key messages where senderId === anonUid
    const msgsSnap = await getDocs(
      collection(db, 'dms', oldDmId, 'messages')
    )
    for (const msgDoc of msgsSnap.docs) {
      const msg = msgDoc.data() as any
      const updatedFields: Record<string, any> = {}
      if (msg.senderId === anonUid) {
        updatedFields.senderId = permanentUid
      }
      if (msg.dmId === oldDmId && newDmId !== oldDmId) {
        updatedFields.dmId = newDmId
      }
      if (Object.keys(updatedFields).length > 0) {
        if (newDmId !== oldDmId) {
          // Write message into new DM subcollection
          const newMsgRef = doc(db, 'dms', newDmId, 'messages', msgDoc.id)
          batch.set(newMsgRef, { ...msg, ...updatedFields })
        } else {
          batch.update(msgDoc.ref, updatedFields)
        }
      } else if (newDmId !== oldDmId) {
        // Message unchanged but needs to move to new DM path
        const newMsgRef = doc(db, 'dms', newDmId, 'messages', msgDoc.id)
        batch.set(newMsgRef, msg)
      }
    }
  }

  // 2. If the permanent user doesn't have a profile yet, copy the anon profile
  const permanentProfileRef = doc(db, 'users', permanentUid)
  const permanentSnap = await getDoc(permanentProfileRef)
  if (!permanentSnap.exists()) {
    const anonSnap = await getDoc(doc(db, 'users', anonUid))
    if (anonSnap.exists()) {
      batch.set(permanentProfileRef, {
        ...anonSnap.data(),
        uid: permanentUid,
        isPermanent: true,
      })
    }
  } else {
    // Mark existing profile as permanent
    batch.update(permanentProfileRef, { isPermanent: true })
  }

  await batch.commit()

  // 3. Clean up old DM docs and anonymous user profile (outside batch — deletes)
  for (const dmDoc of dmsSnap.docs) {
    const dm = dmDoc.data() as any
    const newParticipants: string[] = dm.participants.map((p: string) =>
      p === anonUid ? permanentUid : p
    )
    const newDmId = [...newParticipants].sort().join('_')
    if (newDmId !== dmDoc.id) {
      // Delete old messages subcollection first
      const msgsSnap = await getDocs(
        collection(db, 'dms', dmDoc.id, 'messages')
      )
      const deleteBatch = writeBatch(db)
      for (const m of msgsSnap.docs) {
        deleteBatch.delete(m.ref)
      }
      deleteBatch.delete(dmDoc.ref)
      await deleteBatch.commit()
    }
  }

  // Delete the anonymous user's profile
  try {
    await deleteDoc(doc(db, 'users', anonUid))
  } catch {
    // Best-effort — security rules may block this after sign-out
  }
}

/**
 * Block a user: add blockerUid to their profile's blockedBy-style tracking,
 * add targetUid to the blocker's own blockedUsers list, and stamp blockedBy on the DM.
 */
export async function blockUser(
  blockerUid: string,
  targetUid: string,
  dmId: string | null
): Promise<void> {
  const blockerRef = doc(db, 'users', blockerUid)
  // Add targetUid to this user's blockedUsers list in Firestore
  await updateDoc(blockerRef, { blockedUsers: arrayUnion(targetUid) })

  // Stamp the DM doc so Firestore rules can enforce it without extra reads
  if (dmId) {
    const dmRef = doc(db, 'dms', dmId)
    await updateDoc(dmRef, { blockedBy: arrayUnion(blockerUid) })
  }
}

/**
 * Unblock a user: remove targetUid from blocker's blockedUsers and clear DM blockedBy entry.
 */
export async function unblockUser(
  blockerUid: string,
  targetUid: string,
  dmId: string | null
): Promise<void> {
  const blockerRef = doc(db, 'users', blockerUid)
  await updateDoc(blockerRef, { blockedUsers: arrayRemove(targetUid) })

  if (dmId) {
    const dmRef = doc(db, 'dms', dmId)
    await updateDoc(dmRef, { blockedBy: arrayRemove(blockerUid) })
  }
}

/**
 * Full cleanup for anonymous users on sign-out or tab close.
 * Order matters: Storage → messages → DM docs → user profile → auth user delete.
 */
export async function deleteAnonUser(uid: string): Promise<void> {
  try {
    // 1. Find all DMs this user participates in
    const dmsSnap = await getDocs(
      query(collection(db, 'dms'), where('participants', 'array-contains', uid))
    )

    for (const dmDoc of dmsSnap.docs) {
      const msgsSnap = await getDocs(collection(db, 'dms', dmDoc.id, 'messages'))

      // 2. Best-effort: delete Storage images
      const { deleteImage } = await import('./storage')
      for (const m of msgsSnap.docs) {
        const data = m.data() as any
        if (data.mediaRef) {
          await deleteImage(data.mediaRef).catch(() => {})
        }
      }

      // 3. Delete messages in batches of 500
      for (let i = 0; i < msgsSnap.docs.length; i += 500) {
        const batch = writeBatch(db)
        for (const m of msgsSnap.docs.slice(i, i + 500)) {
          batch.delete(m.ref)
        }
        await batch.commit()
      }

      // 4. Delete the DM doc itself
      await deleteDoc(dmDoc.ref).catch(() => {})
    }

    // 5. Delete RTDB presence node
    try {
      await remove(ref(rtdb, `presence/${uid}`))
    } catch {
      // Best-effort
    }

    // 6. Delete avatar from Storage if present
    try {
      const profileSnap = await getDoc(doc(db, 'users', uid))
      if (profileSnap.exists()) {
        const avatarPath = profileSnap.data().avatarPath
        if (avatarPath) {
          const { deleteAvatar } = await import('./storage')
          await deleteAvatar(avatarPath).catch(() => {})
        }
      }
    } catch {
      // Best-effort
    }

    // 7. Delete Firestore user profile
    await deleteDoc(doc(db, 'users', uid)).catch(() => {})

    // 9. Delete the Firebase Auth user — MUST be last
    const user = auth.currentUser
    if (user && user.uid === uid) {
      await user.delete()
    }
  } catch (e) {
    console.error('[deleteAnonUser] cleanup failed:', e)
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function logout(isAnon = false, uid?: string) {
  if (isAnon && uid) {
    await deleteAnonUser(uid)
  } else {
    await signOut(auth)
  }
}

export function currentUser() {
  return auth.currentUser
}
