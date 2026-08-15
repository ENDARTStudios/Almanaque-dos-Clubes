import { z } from 'zod';

export const PlayerPosition = z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']);
export type PlayerPosition = z.infer<typeof PlayerPosition>;

export const CreatePlayerSchema = z.object({
  fullName: z.string().min(2).max(300),
  shortName: z.string().min(1).max(50).optional(),
  birthDate: z
    .string()
    .datetime()
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  country: z.string().min(2).max(2, 'Use ISO 3166-1 alpha-2').optional(),
  position: PlayerPosition.optional(),
  clubId: z.string().uuid().optional(),
  qid: z
    .string()
    .regex(/^Q\d+$/, 'QID deve começar com Q seguido de números')
    .optional(),
  importedFrom: z.string().optional(),
});
export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;

export interface Player {
  id: string;
  fullName: string;
  shortName: string | null;
  birthDate: Date | null;
  country: string | null;
  position: string | null;
  clubId: string | null;
  qid: string | null;
  importedFrom: string | null;
  importedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
