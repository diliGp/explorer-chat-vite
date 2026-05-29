import { useEffect } from 'react'
import { useAppStore } from '@/store'

export function useTheme() {
  const { theme, setTheme } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && media.matches)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  const toggle = () => {
    const current = document.documentElement.classList.contains('dark')
    setTheme(current ? 'light' : 'dark')
  }

  return { theme, setTheme, toggle }
}
