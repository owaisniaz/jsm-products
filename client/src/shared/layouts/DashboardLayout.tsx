import {
  Building2,
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useLogoutMutation } from '@/modules/auth/hooks/useAuthMutations'
import { useAuthStore } from '@/modules/auth/store/useAuthStore'
import { useCompaniesQuery } from '@/modules/organization/hooks/useOrganization'
import { ThemeToggle } from '@/shared/components/theme/ThemeToggle'

const navigationItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Companies', icon: Building2 },
  { label: 'People', icon: Users },
  { label: 'Roles & permissions', icon: Shield },
  { label: 'Attendance', icon: Clock },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
]

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useLogoutMutation()
  const companies = useCompaniesQuery()
  const activeCompany = companies.data?.data[0]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Building2 className="mr-2 h-5 w-5 text-primary" strokeWidth={1.75} />
          <span className="font-semibold tracking-tight text-foreground">JSM Workspace</span>
        </div>
        <nav aria-label="Main navigation" className="space-y-1 p-3">
          {navigationItems.map(({ label, icon: Icon, href }) =>
            href ? (
              <NavLink
                key={label}
                to={href}
                className={({ isActive }) =>
                  `flex h-9 items-center gap-2.5 rounded-md border px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-border bg-muted/40 text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`
                }
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
                {label}
              </NavLink>
            ) : (
              <div
                key={label}
                aria-disabled="true"
                title="Coming soon"
                className="flex h-9 items-center gap-2.5 rounded-md border border-transparent px-3 text-sm text-muted-foreground/70"
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
                <span>{label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
              </div>
            ),
          )}
        </nav>
      </aside>
      <header className="fixed right-0 top-0 left-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:left-64 lg:px-7">
        <div className="flex items-center">
          <Menu className="mr-3 h-5 w-5 text-muted-foreground lg:hidden" strokeWidth={1.75} />
          <button className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40" type="button">
            {activeCompany?.name ?? 'Select tenant'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">{user?.username}</span>
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} /> Sign out
          </button>
        </div>
      </header>
      <main className="pt-16 lg:pl-64">
        <Outlet />
      </main>
    </div>
  )
}
