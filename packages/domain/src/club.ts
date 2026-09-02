import { z } from 'zod';

export const ClubStatus = z.enum(['ACTIVE', 'INACTIVE', 'DISSOLVED']);
export type ClubStatus = z.infer<typeof ClubStatus>;

export const CreateClubSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  fullName: z.string().min(2).max(300).optional(),
  shortName: z.string().min(1).max(20).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  country: z.string().min(2).max(2, 'Use ISO 3166-1 alpha-2 (ex.: BR, AR, PT)').optional(),
  foundedYear: z.number().int().min(1850).max(new Date().getFullYear()).optional(),
  status: ClubStatus.default('ACTIVE'),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato #RRGGBB')
    .optional(),
  website: z.string().url().optional(),
  qid: z
    .string()
    .regex(/^Q\d+$/, 'QID deve começar com Q seguido de números')
    .optional(),
  importedFrom: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateClubInput = z.infer<typeof CreateClubSchema>;

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
  qid: string | null;
  importedFrom: string | null;
  importedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}
