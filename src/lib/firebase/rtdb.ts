import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  get,
} from 'firebase/database'
import { rtdb } from './client'

export const presenceRef = (uid: string) => ref(rtdb, `presence/${uid}`)

export const typingRef = (uid: string, dmId: string) =>
  ref(rtdb, `presence/${uid}/typing/${dmId}`)

export async function setOnline(uid: string) {
  const pRef = presenceRef(uid)
  await set(pRef, { online: true, lastSeen: serverTimestamp() })
  // Auto-set offline on disconnect
  onDisconnect(pRef).set({ online: false, lastSeen: serverTimestamp() })
}

export async function setOffline(uid: string) {
  await set(presenceRef(uid), { online: false, lastSeen: serverTimestamp() })
}

export async function setTyping(uid: string, dmId: string, isTyping: boolean) {
  const tRef = typingRef(uid, dmId)
  await set(tRef, isTyping)
  if (isTyping) {
    onDisconnect(tRef).set(false)
  }
}

export function listenToPresence(
  uid: string,
  callback: (data: { online: boolean; lastSeen: number }) => void
) {
  return onValue(presenceRef(uid), (snap) => {
    callback(snap.val() ?? { online: false, lastSeen: Date.now() })
  })
}

export function listenToAllPresence(
  callback: (data: Record<string, { online: boolean; lastSeen: number }>) => void
) {
  return onValue(ref(rtdb, 'presence'), (snap) => {
    callback(snap.val() ?? {})
  })
}

export function listenToTyping(
  dmId: string,
  participants: string[],
  callback: (typingUids: string[]) => void
) {
  // Listen to each participant's typing status for this DM
  const unsubs: (() => void)[] = []
  const states: Record<string, boolean> = {}

  for (const uid of participants) {
    const unsubscribe = onValue(typingRef(uid, dmId), (snap) => {
      states[uid] = snap.val() === true
      callback(Object.keys(states).filter((u) => states[u]))
    })
    unsubs.push(() => unsubscribe())
  }

  return () => unsubs.forEach((fn) => fn())
}
