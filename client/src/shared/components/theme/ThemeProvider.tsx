import { useEffect, useState, type ReactNode } from 'react'
import {
  ThemeContext,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from './theme-context'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
    ? storedTheme
    : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const nextTheme =
        theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme
      root.classList.toggle('dark', nextTheme === 'dark')
      root.style.colorScheme = nextTheme
      setResolvedTheme(nextTheme)
    }

    applyTheme()
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)

    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme)
      return () => mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
