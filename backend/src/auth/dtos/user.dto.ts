
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
});

export class UserDto extends createZodDto(UserSchema) {}
export class LoginDto extends createZodDto(LoginSchema) {}
