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
  createdAt: Date;
  updatedAt: Date;
}
