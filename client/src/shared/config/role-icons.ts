import {
  Award,
  Building,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  Clock,
  Crown,
  FileSearch,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldPlus,
  ShoppingBag,
  SlidersHorizontal,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export const ROLE_ICONS = {
  OWNER: Crown,
  SUPER_ADMIN: Crown,
  MANAGER: ShieldCheck,
  TEAM_LEAD: UserCheck,
  STAFF: User,
  EMPLOYEE: User,
  CUSTOMER: ShoppingBag,
} satisfies Record<string, LucideIcon>

export type RoleIconName = keyof typeof ROLE_ICONS
export type AccountType = 'OWNER' | 'STAFF'

export function normalizeRoleName(roleName: string): RoleIconName | undefined {
  const normalized = roleName.trim().replace(/[\s-]+/g, '_').toUpperCase()
  return Object.hasOwn(ROLE_ICONS, normalized)
    ? (normalized as RoleIconName)
    : undefined
}

export const ORGANIZATION_LEVEL_ICONS = {
  GROUP: Building2,
  HOLDING: Building2,
  STANDALONE: Building,
  COMPANY: Building,
  CHILD_COMPANY: Building,
} satisfies Record<string, LucideIcon>

export const PERMISSION_ACTION_ICONS: Record<string, LucideIcon> = {
  'employee:create': UserPlus,
  'employee:invite': UserPlus,
  'employee:read': Users,
  'employee:update': UserCog,
  'employee:delete': UserX,
  'employee:suspend': UserX,
  'employee:manage_roles': KeyRound,
  'employee:promote': Award,
  'role:create': ShieldPlus,
  'role:manage': ShieldPlus,
  'role:assign': KeyRound,
  'attendance:read': Clock,
  'attendance:update': CalendarCheck2,
  'attendance:approve': CalendarCheck2,
  'leaves:approve': ClipboardCheck,
  'company:settings': SlidersHorizontal,
  billing: Wallet,
  payroll: Wallet,
  'billing:read': Wallet,
  'billing:manage': Wallet,
  'payroll:read': Wallet,
  'payroll:manage': Wallet,
  'audit:read': FileSearch,
}

export const STATUS_BADGE_CLASSES = {
  PRESENT: 'border-success/30 bg-success/10 text-success',
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  LATE: 'border-warning/30 bg-warning/10 text-warning',
  INVITED: 'border-info/30 bg-info/10 text-info',
  ON_LEAVE: 'border-info/30 bg-info/10 text-info',
  ABSENT: 'border-destructive/30 bg-destructive/10 text-destructive',
  SUSPENDED: 'border-destructive/30 bg-destructive/10 text-destructive',
} as const

export const FALLBACK_ROLE_ICON = Shield
