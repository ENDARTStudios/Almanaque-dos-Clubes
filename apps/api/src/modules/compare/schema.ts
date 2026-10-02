import { z } from 'zod';

// Exatamente 2 ids (uuid), separados por vírgula: ?ids=a,b
export const CompareQuerySchema = z.object({
  ids: z
    .string()
    .regex(/^[0-9a-fA-F-]{36},[0-9a-fA-F-]{36}$/, 'Informe exatamente 2 ids separados por vírgula'),
});

export function parseCompareIds(ids: string): [string, string] {
  const parts = ids.split(',');
  if (parts.length !== 2) throw new Error('ids deve conter exatamente 2 valores');
  return [parts[0], parts[1]];
}
