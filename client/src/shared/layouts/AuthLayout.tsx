import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/useAuthStore'
import { ThemeToggle } from '@/shared/components/theme/ThemeToggle'

export function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasSetup = useAuthStore((state) => state.hasCompletedCompanySetup)
  if (isAuthenticated) {
    return <Navigate to={hasSetup ? '/dashboard' : '/onboarding/company'} replace />
  }
  return (
    <main className="relative grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <ThemeToggle className="absolute right-4 top-4" />
      <Outlet />
    </main>
  )
}
