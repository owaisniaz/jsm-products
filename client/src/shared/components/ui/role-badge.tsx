import {
  FALLBACK_ROLE_ICON,
  normalizeRoleName,
  ROLE_ICONS,
  type AccountType,
} from '@/shared/config/role-icons'

interface RoleBadgeProps {
  roleName: string
  accountType?: AccountType
  className?: string
}

function formatRoleName(roleName: string): string {
  return roleName
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function RoleBadge({
  roleName,
  accountType,
  className = '',
}: RoleBadgeProps) {
  const role = accountType === 'OWNER'
    ? 'OWNER'
    : normalizeRoleName(roleName) ?? (accountType === 'STAFF' ? 'STAFF' : undefined)
  const Icon = role ? ROLE_ICONS[role] : FALLBACK_ROLE_ICON
  const tint =
    role === 'OWNER'
      ? 'border-warning/30 bg-warning/10 text-warning'
      : role === 'MANAGER'
        ? 'border-primary/30 bg-primary/10 text-primary'
        : role === 'TEAM_LEAD'
          ? 'border-info/30 bg-info/10 text-info'
          : 'border-border bg-muted/40 text-muted-foreground'
  const label = accountType === 'OWNER' ? 'Owner' : formatRoleName(roleName)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${tint} ${className}`}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={1.75} />
      {label}
    </span>
  )
}
