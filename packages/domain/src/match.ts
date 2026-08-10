import { z } from 'zod';

export const MatchStatus = z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED', 'POSTPONED']);
export type MatchStatus = z.infer<typeof MatchStatus>;

export const CreateMatchSchema = z.object({
  homeClubId: z.string().uuid(),
  awayClubId: z.string().uuid(),
  date: z.string().datetime(),
  competitionId: z.string().uuid().optional(),
  seasonId: z.string().uuid().optional(),
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  round: z.string().min(1).max(50).optional(),
  venue: z.string().min(1).max(200).optional(),
  status: MatchStatus.default('SCHEDULED'),
});
export type CreateMatchInput = z.infer<typeof CreateMatchSchema>;

export interface Match {
  id: string;
  homeClubId: string;
  awayClubId: string;
  date: Date;
  competitionId: string | null;
  seasonId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  round: string | null;
  venue: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
