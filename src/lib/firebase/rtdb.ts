import {
  ref,
  set,
  onValue,
  onDisconnect,
  get,
  serverTimestamp,
} from 'firebase/database'
import { rtdb } from './client'

export const presenceRef = (uid: string) => ref(rtdb, `presence/${uid}`)

export const typingRef = (uid: string, dmId: string) =>
  ref(rtdb, `presence/${uid}/typing/${dmId}`)

// Tracks the active presence unsubscribe so we don't stack listeners
let presenceUnsub: (() => void) | null = null

export function setupPresence(uid: string): () => void {
  // Cancel any previous presence listener (but do NOT set offline here —
  // let onDisconnect handle real disconnects to avoid navigation flicker)
  if (presenceUnsub) presenceUnsub()

  const pRef = presenceRef(uid)
  const connectedRef = ref(rtdb, '.info/connected')

  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // Re-register onDisconnect and set online every time we reconnect
      onDisconnect(pRef).set({ online: false, lastSeen: Date.now() }).catch(() => {})
      set(pRef, { online: true, lastSeen: Date.now() }).catch(() => {})
    }
  })

  presenceUnsub = unsub
  return () => {
    unsub()
    presenceUnsub = null
    // Only set offline on intentional cleanup (tab close / sign-out)
    set(pRef, { online: false, lastSeen: Date.now() })
  }
}

export async function setOnline(uid: string) {
  const pRef = presenceRef(uid)
  await set(pRef, { online: true, lastSeen: Date.now() })
  onDisconnect(pRef).set({ online: false, lastSeen: Date.now() })
}

export async function setOffline(uid: string) {
  await set(presenceRef(uid), { online: false, lastSeen: Date.now() })
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
