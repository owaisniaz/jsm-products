import { z } from 'zod'

export const signUpSchema = z.object({
  username: z.string().trim().min(3).max(25),
  email: z.string().trim().email(),
  password: z.string().min(8),
  passwordConfirm: z.string().min(1),
  photo: z.string().optional(),
}).refine((value) => value.password === value.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
})

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
})

export const resetPasswordOtpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().length(6, 'Enter the 6-digit code').regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type SignUpValues = z.infer<typeof signUpSchema>
export type SignInValues = z.infer<typeof signInSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordOtpValues = z.infer<typeof resetPasswordOtpSchema>
export type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>
