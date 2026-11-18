import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from './useTheme'
import type { Theme } from './theme-context'

const themeIcons: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const nextTheme: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const Icon = themeIcons[theme]

  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      aria-label={`Current theme: ${theme}. Switch to ${nextTheme[theme]} mode.`}
      title={`Theme: ${theme}`}
      onClick={() => setTheme(nextTheme[theme])}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
    </button>
  )
}
