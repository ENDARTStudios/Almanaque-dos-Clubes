import { z } from 'zod';

export const CompetitionType = z.enum(['LEAGUE', 'CUP', 'TOURNAMENT', 'SUPER_CUP']);
export type CompetitionType = z.infer<typeof CompetitionType>;

export const CreateCompetitionSchema = z.object({
  name: z.string().min(2).max(300),
  country: z.string().min(2).max(2, 'Use ISO 3166-1 alpha-2').optional(),
  type: CompetitionType.optional(),
});
export type CreateCompetitionInput = z.infer<typeof CreateCompetitionSchema>;

export interface Competition {
  id: string;
  name: string;
  country: string | null;
  type: string | null;
  createdAt: Date;
  updatedAt: Date;
}
