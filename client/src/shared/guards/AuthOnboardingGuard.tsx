import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/useAuthStore'

export function AuthOnboardingGuard() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasSetup = useAuthStore((state) => state.hasCompletedCompanySetup)

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace state={{ from: location }} />
  }
  if (!hasSetup && location.pathname !== '/onboarding/company') {
    return <Navigate to="/onboarding/company" replace />
  }
  if (hasSetup && location.pathname === '/onboarding/company') {
    return <Navigate to="/dashboard" replace />
  }
  if (location.pathname === '/' || location.pathname !== '/dashboard') {
    if (hasSetup) return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
