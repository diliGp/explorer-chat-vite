'use client'

import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useTheme } from '@/lib/hooks/useTheme'
import { useAuth } from '@/lib/hooks/useAuth'

function ThemeAndAuth({ children }: { children: React.ReactNode }) {
  useTheme()
  useAuth()
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeAndAuth>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </ThemeAndAuth>
  )
}
