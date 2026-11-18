import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { AuthOnboardingGuard } from '@/shared/guards/AuthOnboardingGuard'
import { DashboardLayout } from '@/shared/layouts/DashboardLayout'
import { ForgotPasswordPage, SignInPage, SignUpPage } from '@/modules/auth'
import { CompanyOnboardingPage } from '@/modules/organization'
import { DashboardPage } from '@/modules/dashboard'

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'signin', element: <SignInPage /> },
      { path: 'signup', element: <SignUpPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <AuthOnboardingGuard />,
    children: [
      { path: '/onboarding/company', element: <CompanyOnboardingPage /> },
      {
        element: <DashboardLayout />,
        children: [{ path: '/dashboard', element: <DashboardPage /> }],
      },
    ],
  },
  { path: '*', element: <AuthOnboardingGuard /> },
])
