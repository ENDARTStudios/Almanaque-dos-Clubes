import { z } from 'zod';

/** T439 — payload legado (club-only); mantido por compatibilidade. */
export const CreateFavoriteSchema = z.object({
  clubId: z.string().uuid(),
});

/** WS-C-12 — payload polymorphic. */
export const CreateTargetFavoriteSchema = z.object({
  targetType: z.enum(['club', 'player', 'competition']),
  targetId: z.string(),
});

export type CreateFavoriteInput = z.infer<typeof CreateFavoriteSchema>;
export type CreateTargetFavoriteInput = z.infer<typeof CreateTargetFavoriteSchema>;
