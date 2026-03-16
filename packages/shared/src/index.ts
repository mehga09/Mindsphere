import { z } from 'zod';

export const UserRoleSchema = z.enum(['LEARNER', 'ADMIN', 'ANALYST']);

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
