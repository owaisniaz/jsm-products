
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(25, 'Username cannot exceed 25 characters'),

    email: z.string().trim().pipe(z.email('Invalid email address')),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),

    passwordConfirm: z
      .string()
      .min(1, 'Please confirm your password'),

    photo: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

export const LoginSchema = z.object({
  email: z.string().trim().pipe(z.email('Invalid email address')),

  password: z.string().min(1, 'Password is required'),
  companyCode: z.string().trim().toUpperCase().optional(),
});

export class UserDto extends createZodDto(UserSchema) {}
export class LoginDto extends createZodDto(LoginSchema) {}

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
}).strict();

export class AcceptInviteDto extends createZodDto(AcceptInviteSchema) {}

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email('Invalid email address')),
}).strict();

export const VerifyResetOtpSchema = z.object({
  email: z.string().trim().pipe(z.email('Invalid email address')),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
}).strict();

export const ResetPasswordSchema = VerifyResetOtpSchema.extend({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).strict();

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).strict();

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export class VerifyResetOtpDto extends createZodDto(VerifyResetOtpSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
export class UpdatePasswordDto extends createZodDto(UpdatePasswordSchema) {}
