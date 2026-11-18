import {
  FALLBACK_ROLE_ICON,
  PERMISSION_ACTION_ICONS,
} from '@/shared/config/role-icons'

interface PermissionActionItemProps {
  permission: string
  label: string
  className?: string
}

export function PermissionActionItem({
  permission,
  label,
  className = '',
}: PermissionActionItemProps) {
  const Icon = PERMISSION_ACTION_ICONS[permission] ?? FALLBACK_ROLE_ICON

  return (
    <span className={`inline-flex items-center gap-2 text-sm text-foreground ${className}`}>
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </span>
  )
}
