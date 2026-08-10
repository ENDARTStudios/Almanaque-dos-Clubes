import { z } from 'zod';

export const CreateGraphEdgeSchema = z.object({
  sourceId: z.string().uuid(),
  sourceType: z.enum(['Club', 'Player', 'Competition']),
  targetId: z.string().uuid(),
  targetType: z.enum(['Club', 'Player', 'Competition']),
  relation: z.enum(['PLAYED_FOR', 'MANAGED_BY', 'PART_OF', 'WON', 'RIVAL']),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateGraphEdgeInput = z.infer<typeof CreateGraphEdgeSchema>;

export interface GraphEdge {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relation: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
