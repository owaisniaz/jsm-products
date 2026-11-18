import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppApiError } from '@/shared/api/api-error'
import { mapServerErrorsToForm } from '@/shared/components/form/map-server-errors'
import { authApi } from '@/modules/auth/api/auth.api'
import { useAuthStore } from '@/modules/auth/store/useAuthStore'
import type {
  ForgotPasswordValues,
  ResetPasswordOtpValues,
  SignInValues,
  SignUpValues,
  UpdatePasswordValues,
} from '@/modules/auth/schemas/auth.schema'
import type { FieldValues, UseFormSetError } from 'react-hook-form'

function handleMutationError<T extends FieldValues>(
  error: Error,
  setError: UseFormSetError<T>,
) {
  if (error instanceof AppApiError && mapServerErrorsToForm(error, setError)) {
    return
  }
  toast.error(error.message)
}

export function useSignUpMutation() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  return useMutation({
    mutationFn: (values: SignUpValues) => authApi.signUp(values),
    onSuccess: ({ user }) => {
      setSession(user, false)
      toast.success('Account created')
      navigate('/onboarding/company', { replace: true })
    },
    onError: (error: AppApiError) => toast.error(error.message),
  })
}

export function useSignInMutation() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  return useMutation({
    mutationFn: (values: SignInValues) => authApi.signIn(values),
    onSuccess: ({ user, hasCompletedCompanySetup }) => {
      if (hasCompletedCompanySetup === true) {
        setSession(user, true)
        toast.success('Signed in')
        navigate('/dashboard', { replace: true })
      } else {
        setSession(user, false)
        navigate('/onboarding/company', { replace: true })
      }
    },
    onError: (error: AppApiError) => toast.error(error.message),
  })
}

export function useLogoutMutation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearSession = useAuthStore((state) => state.clearSession)
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearSession()
      queryClient.clear()
      navigate('/auth/signin', { replace: true })
    },
  })
}

export function useForgotPasswordMutation(
  setError: UseFormSetError<ForgotPasswordValues>,
) {
  return useMutation({
    mutationFn: (values: ForgotPasswordValues) => authApi.forgotPassword(values),
    onError: (error: Error) => handleMutationError(error, setError),
  })
}

export function useResetPasswordMutation(
  setError: UseFormSetError<ResetPasswordOtpValues>,
) {
  return useMutation({
    mutationFn: (values: ResetPasswordOtpValues) => authApi.resetPassword(values),
    onError: (error: Error) => handleMutationError(error, setError),
  })
}

export function useUpdatePasswordMutation(
  setError: UseFormSetError<UpdatePasswordValues>,
) {
  return useMutation({
    mutationFn: (values: UpdatePasswordValues) => authApi.updatePassword(values),
    onError: (error: Error) => handleMutationError(error, setError),
  })
}
