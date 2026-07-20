import { z } from 'zod';

/**
 * Tipos primitivos do domínio de Clubes.
 * Estes tipos refletem exatamente o que está no Prisma schema.
 */

export const ClubStatus = z.enum(['ACTIVE', 'INACTIVE', 'DISSOLVED']);
export type ClubStatus = z.infer<typeof ClubStatus>;

/**
 * Schema de validação para criação de um clube.
 * Usado tanto no controller Fastify quanto em testes.
 */
export const CreateClubSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  fullName: z.string().min(2).max(300).optional(),
  shortName: z.string().min(1).max(20).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  country: z.string().min(2).max(2, 'Use ISO 3166-1 alpha-2 (ex.: BR, AR, PT)').optional(),
  foundedYear: z
    .number()
    .int()
    .min(1850)
    .max(new Date().getFullYear())
    .optional(),
  status: ClubStatus.default('ACTIVE'),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato #RRGGBB')
    .optional(),
  website: z.string().url().optional(),
});

export type CreateClubInput = z.infer<typeof CreateClubSchema>;

/**
 * Tipo canônico de um Clube (espelha o modelo Prisma).
 */
export interface Club {
  id: string;
  name: string;
  fullName: string | null;
  shortName: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  foundedYear: number | null;
  status: ClubStatus;
  primaryColor: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}
