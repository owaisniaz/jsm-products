import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  username: string
  email: string
  photo?: string
  roles: string[]
  hasCompletedCompanySetup?: boolean
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  hasCompletedCompanySetup: boolean
  setSession: (user: AuthUser, hasCompletedCompanySetup: boolean) => void
  completeCompanySetup: () => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasCompletedCompanySetup: false,
      setSession: (user, hasCompletedCompanySetup) =>
        set({ user, isAuthenticated: true, hasCompletedCompanySetup }),
      completeCompanySetup: () => set({ hasCompletedCompanySetup: true }),
      clearSession: () =>
        set({ user: null, isAuthenticated: false, hasCompletedCompanySetup: false }),
    }),
    { name: 'auth-session' },
  ),
)
