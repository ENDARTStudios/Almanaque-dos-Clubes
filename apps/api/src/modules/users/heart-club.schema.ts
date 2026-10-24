import { z } from 'zod';

/** T596 — corpo de PUT /users/me/heart-club. */
export const SetHeartClubSchema = z.object({
  clubId: z.string().uuid(),
});

export type SetHeartClubInput = z.infer<typeof SetHeartClubSchema>;
