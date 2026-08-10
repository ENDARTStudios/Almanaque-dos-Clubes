import { z } from 'zod';

export const SeasonStatus = z.enum(['PLANNED', 'ONGOING', 'FINISHED']);
export type SeasonStatus = z.infer<typeof SeasonStatus>;

export const CreateSeasonSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z
    .string()
    .datetime()
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  endDate: z
    .string()
    .datetime()
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  status: SeasonStatus.default('PLANNED'),
});
export type CreateSeasonInput = z.infer<typeof CreateSeasonSchema>;

export interface Season {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
