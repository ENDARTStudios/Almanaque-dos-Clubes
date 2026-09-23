/**
 * T448b-2b FASE 2 — Soft-delete LÓGICO de arestas do KnowledgeGraph.
 *
 * `KnowledgeGraph` não tem coluna `deletedAt`; o marcador vive em
 * `metadata.deletedAt` (ISO-8601). Leitores públicos/agregações DEVEM excluir
 * arestas marcadas — nunca hard delete. Filtro aplicado em memória (o filtro
 * JSONB `metadata->>'deletedAt' IS NULL` é equivalente, mas não é expressável
 * de forma estável no Prisma para o par SQLite/Postgres).
 */

export function isEdgeSoftDeleted(metadata: unknown): boolean {
  const m = (metadata as Record<string, unknown> | null) ?? {};
  const v = m.deletedAt;
  return typeof v === 'string' && v.trim() !== '';
}

export function excludeSoftDeleted<T extends { metadata: unknown }>(rows: T[]): T[] {
  return rows.filter((r) => !isEdgeSoftDeleted(r.metadata));
}
