import { axiosInstance } from '@/shared/api/axios-instance'
import type { AuthUser } from '@/modules/auth/store/useAuthStore'
import type {
  ForgotPasswordValues,
  ResetPasswordOtpValues,
  SignInValues,
  SignUpValues,
  UpdatePasswordValues,
} from '@/modules/auth/schemas/auth.schema'

interface AuthResponse {
  user: AuthUser
  hasCompletedCompanySetup?: boolean
}

interface MessageResponse {
  message: string
}

export const authApi = {
  signUp: async (values: SignUpValues): Promise<AuthResponse> => {
    const user = await axiosInstance.post<AuthUser, AuthUser>('/auth/signup', values)
    return { user, hasCompletedCompanySetup: false }
  },
  signIn: async (values: SignInValues): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse | AuthUser, AuthResponse | AuthUser>('/auth/signin', values)
    if ('user' in response && 'hasCompletedCompanySetup' in response) {
      return response as AuthResponse
    }
    const user = response as AuthUser
    return {
      user,
      hasCompletedCompanySetup:
        typeof user.hasCompletedCompanySetup === 'boolean'
          ? user.hasCompletedCompanySetup
          : undefined,
    }
  },
  refresh: () => axiosInstance.post<AuthUser, AuthUser>('/auth/refresh'),
  getMe: () => axiosInstance.post<AuthUser, AuthUser>('/auth/refresh'),
  logout: () => axiosInstance.post<void, void>('/auth/logout'),
  forgotPassword: (values: ForgotPasswordValues) =>
    axiosInstance.post<MessageResponse, MessageResponse>('/auth/forgot-password', values),
  verifyResetOtp: (values: Pick<ResetPasswordOtpValues, 'email' | 'otp'>) =>
    axiosInstance.post<MessageResponse, MessageResponse>('/auth/verify-otp', values),
  resetPassword: ({ email, otp, newPassword }: ResetPasswordOtpValues) =>
    axiosInstance.post<MessageResponse, MessageResponse>('/auth/reset-password', {
      email,
      otp,
      newPassword,
    }),
  updatePassword: ({ currentPassword, newPassword }: UpdatePasswordValues) =>
    axiosInstance.patch<AuthUser, AuthUser>('/auth/update-password', {
      currentPassword,
      newPassword,
    }),
}
