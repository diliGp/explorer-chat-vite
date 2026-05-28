'use client'

import { useEffect, useRef } from 'react'
import { onAuthChange, signInAnonymous, logout } from '@/lib/firebase/auth'
import { setupPresence } from '@/lib/firebase/rtdb'
import { userDoc } from '@/lib/firebase/firestore'
import { getDoc } from 'firebase/firestore'
import { useAppStore } from '@/store'

// Module-level flag: prevents re-sign-in after intentional account deletion
let _intentionalDelete = false

export function useAuth() {
  const { currentUser, setCurrentUser, setAuthReady } = useAppStore()
  const initialized = useRef(false)
  const cleanupPresence = useRef<(() => void) | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        // Ensure token is fresh before Firestore reads
        await user.getIdToken(true).catch(() => {})
        // Load profile from Firestore
        const snap = await getDoc(userDoc(user.uid))
        if (snap.exists()) {
          const profile = { ...snap.data(), uid: user.uid }
          setCurrentUser(profile)
          // Set up persistent presence with auto-reconnect
          cleanupPresence.current = setupPresence(user.uid)
        } else if (!initialized.current) {
          // New anonymous user — no profile yet, will be created in onboarding
          setCurrentUser(null)
        }
        initialized.current = true
        setAuthReady(true)
      } else {
        // Not signed in — sign in anonymously (unless intentional account deletion)
        if (!_intentionalDelete) {
          try {
            await signInAnonymous()
          } catch (e) {
            console.error('Anonymous sign-in failed', e)
          }
        }
      }
    })

    // Cleanup: go offline and stop presence listener
    return () => {
      unsubscribe()
      cleanupPresence.current?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { currentUser }
}

/**
 * Call this from UI sign-out buttons.
 * For anonymous users: runs full data cleanup before deleting the account.
 * For permanent users: regular sign-out.
 */
export async function handleLogout(
  isPermanent: boolean,
  uid: string,
  setCurrentUser: (u: null) => void
) {
  setCurrentUser(null)
  if (!isPermanent) {
    _intentionalDelete = true
  }
  await logout(!isPermanent, uid)
}
