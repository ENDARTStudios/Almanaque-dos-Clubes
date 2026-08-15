import { z } from 'zod';

export const CreateStadiumSchema = z.object({
  name: z.string().min(2).max(200),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  country: z.string().min(2).max(2, 'Use ISO 3166-1 alpha-2').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().min(100).max(250000).optional(),
  surface: z.enum(['grass', 'artificial', 'hybrid']).optional(),
  qid: z
    .string()
    .regex(/^Q\d+$/, 'QID deve começar com Q seguido de números')
    .optional(),
  clubId: z.string().uuid().optional(),
  importedFrom: z.string().optional(),
});
export type CreateStadiumInput = z.infer<typeof CreateStadiumSchema>;

export interface Stadium {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  surface: string | null;
  qid: string | null;
  clubId: string | null;
  importedFrom: string | null;
  importedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
