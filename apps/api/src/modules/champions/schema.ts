import { z } from 'zod';

export const ChampionsQuerySchema = z.object({
  gender: z.enum(['men', 'women']).optional(),
  hierarchy: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter((s): s is 'mundial' | 'continental' | 'nacional' | 'estadual' | 'municipal' =>
              ['mundial', 'continental', 'nacional', 'estadual', 'municipal'].includes(s),
            )
        : undefined,
    ),
});

export type ChampionsQuery = z.infer<typeof ChampionsQuerySchema>;
