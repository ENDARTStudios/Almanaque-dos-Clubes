/**
 * Schemas de validação (Zod) para rotas /auth/*.
 *
 * Usado como preHandler ou via app.route schema em Fastify.
 */
import { z } from 'zod';

/**
 * Schema para POST /auth/register.
 * Email é normalizado (lowercase + trim).
 * Senha mínimo 8 chars, máximo 128 (limite técnico; argon2 aceita até 2^32).
 */
export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .max(254, 'Email muito longo (máx 254)')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa (máx 128)')
    .regex(/[a-z]/, 'Senha deve conter ao menos 1 letra minúscula')
    .regex(/[A-Z]/, 'Senha deve conter ao menos 1 letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos 1 dígito'),
  name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome muito longo (máx 100)')
    .optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Schema para POST /auth/login.
 * Mensagens genéricas — NÃO revelar se email existe ou senha está errada.
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .max(128, 'Senha muito longa'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Schema para POST /auth/refresh.
 * Sem corpo — refresh token vem do cookie httpOnly.
 * Mas aceitamos body com token para flexibilidade em testes.
 */
export const RefreshSchema = z
  .object({
    refreshToken: z.string().optional(),
  })
  .optional();

export type RefreshInput = z.infer<typeof RefreshSchema>;
