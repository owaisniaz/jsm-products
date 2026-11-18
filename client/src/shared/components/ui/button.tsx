import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }

export function Button({ className = '', variant = 'primary', ...props }: Props) {
  const variants = {
    primary: 'border-primary bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'border-border bg-card text-foreground hover:bg-muted/40',
    danger: 'border-destructive bg-destructive text-destructive-foreground hover:opacity-90',
  }
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
