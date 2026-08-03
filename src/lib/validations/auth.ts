import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .email('E-mail inválido.')
    .toLowerCase()
    .trim(),
  password: z.string().min(1, 'Informe sua senha.')
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .email('E-mail inválido.')
    .toLowerCase()
    .trim()
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const strongPassword = z
  .string()
  .min(10, 'Mínimo de 10 caracteres.')
  .max(128, 'Máximo de 128 caracteres.')
  .refine((v) => /[A-Z]/.test(v), 'Precisa de ao menos uma letra maiúscula.')
  .refine((v) => /[a-z]/.test(v), 'Precisa de ao menos uma letra minúscula.')
  .refine((v) => /[0-9]/.test(v), 'Precisa de ao menos um número.')
  .refine((v) => /[^A-Za-z0-9]/.test(v), 'Precisa de ao menos um caractere especial.');

export const resetPasswordSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string()
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.'
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.'),
    password: strongPassword,
    confirmPassword: z.string()
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.'
  })
  .refine((v) => v.password !== v.currentPassword, {
    path: ['password'],
    message: 'A nova senha deve ser diferente da atual.'
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
