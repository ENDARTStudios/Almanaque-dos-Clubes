import { z } from 'zod';

export const CompetitionType = z.enum(['LEAGUE', 'CUP', 'TOURNAMENT', 'SUPER_CUP']);
export type CompetitionType = z.infer<typeof CompetitionType>;

export const CreateCompetitionSchema = z.object({
  name: z.string().min(2).max(300),
  country: z.string().min(2).max(2, 'Use ISO 3166-1 alpha-2').optional(),
  type: CompetitionType.optional(),
  qid: z
    .string()
    .regex(/^Q\d+$/, 'QID deve começar com Q seguido de números')
    .optional(),
  importedFrom: z.string().optional(),
});
export type CreateCompetitionInput = z.infer<typeof CreateCompetitionSchema>;

export interface Competition {
  id: string;
  name: string;
  country: string | null;
  type: string | null;
  qid: string | null;
  importedFrom: string | null;
  importedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
