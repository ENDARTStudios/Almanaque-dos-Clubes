import { z } from 'zod';

export const CreateRankingSchema = z.object({
  name: z.string().min(2).max(300),
  competitionId: z.string().uuid().optional(),
  season: z.string().min(1).max(20).optional(),
});
export type CreateRankingInput = z.infer<typeof CreateRankingSchema>;

export const UpdateRankingSchema = CreateRankingSchema.partial();
export type UpdateRankingInput = z.infer<typeof UpdateRankingSchema>;

export const CreateRankingEntrySchema = z.object({
  clubId: z.string().uuid(),
  position: z.number().int().min(1),
  points: z.number().int().optional(),
});
export type CreateRankingEntryInput = z.infer<typeof CreateRankingEntrySchema>;

export const UpdateRankingEntrySchema = z.object({
  position: z.number().int().min(1).optional(),
  points: z.number().int().optional(),
});
export type UpdateRankingEntryInput = z.infer<typeof UpdateRankingEntrySchema>;

export interface Ranking {
  id: string;
  name: string;
  competitionId: string | null;
  season: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RankingEntry {
  id: string;
  rankingId: string;
  clubId: string;
  // position NULL = registro sem posição publicada (dados insuficientes) — T425
  position: number | null;
  points: number | null;
  // Base auditável do ranking (T425) — a UI exibe "com base em N partidas / T títulos".
  baseMatches: number | null;
  baseTitles: number | null;
  dataSourceIds: string[] | null;
  reason: string | null;
  gender: 'men' | 'women' | null;
  createdAt: Date;
  updatedAt: Date;
}
