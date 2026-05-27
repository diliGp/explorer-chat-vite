'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { setTyping, listenToTyping } from '@/lib/firebase/rtdb'

const TYPING_TIMEOUT = 2500 // ms

export function useTyping(dmId: string, currentUid: string, participants: string[]) {
  const typingTimer = useRef<NodeJS.Timeout | null>(null)

  const handleInputChange = useCallback(() => {
    setTyping(currentUid, dmId, true)

    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      setTyping(currentUid, dmId, false)
    }, TYPING_TIMEOUT)
  }, [currentUid, dmId])

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current)
    setTyping(currentUid, dmId, false)
  }, [currentUid, dmId])

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [])

  return { handleInputChange, stopTyping }
}

// Returns reactive state (not a ref) so React re-renders on typing changes
export function useTypingStatus(dmId: string, participants: string[], currentUid: string) {
  const [typingUids, setTypingUids] = useState<string[]>([])

  useEffect(() => {
    if (!dmId || participants.length === 0) return
    const others = participants.filter((uid) => uid !== currentUid)
    if (others.length === 0) return
    const unsubscribe = listenToTyping(dmId, others, (uids) => {
      setTypingUids(uids)
    })
    return unsubscribe
  }, [dmId, participants, currentUid])

  return typingUids
}
