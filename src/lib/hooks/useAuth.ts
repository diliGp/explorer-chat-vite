'use client'

import { useEffect, useRef } from 'react'
import { onAuthChange, signInAnonymous } from '@/lib/firebase/auth'
import { setOnline, setOffline } from '@/lib/firebase/rtdb'
import { userDoc } from '@/lib/firebase/firestore'
import { getDoc } from 'firebase/firestore'
import { useAppStore } from '@/store'

export function useAuth() {
  const { currentUser, setCurrentUser } = useAppStore()
  const initialized = useRef(false)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        // Load profile from Firestore
        const snap = await getDoc(userDoc(user.uid))
        if (snap.exists()) {
          setCurrentUser({ ...snap.data(), uid: user.uid })
          await setOnline(user.uid)
        } else if (!initialized.current) {
          // New anonymous user — no profile yet, will be created in onboarding
          setCurrentUser(null)
        }
        initialized.current = true
      } else {
        // Not signed in — sign in anonymously
        try {
          await signInAnonymous()
        } catch (e) {
          console.error('Anonymous sign-in failed', e)
        }
      }
    })

    // Cleanup: go offline
    return () => {
      unsubscribe()
      const uid = useAppStore.getState().currentUser?.uid
      if (uid) setOffline(uid)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { currentUser }
}
