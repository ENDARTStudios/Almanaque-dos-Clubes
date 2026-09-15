import { z } from 'zod';

export const CreateFavoriteSchema = z.object({
  clubId: z.string().uuid(),
});

export type CreateFavoriteInput = z.infer<typeof CreateFavoriteSchema>;
