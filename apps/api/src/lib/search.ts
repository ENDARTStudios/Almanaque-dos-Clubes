/**
 * T448b-2i — busca case-insensitive E acento-insensível sem extensões.
 *
 * Produção não tem unaccent/pg_trgm/citext (só plpgsql — app_user não pode
 * CREATE EXTENSION). O Postgres tem `translate()` NATIVO: remove acentos sem
 * extensão. Lower() resolve o caso. A combinação translate+lower de AMBOS os
 * lados (coluna e termo) torna "gremio" == "Grêmio FBPA" e "sao paulo" ==
 * "São Paulo FC".
 *
 * Contrato: IDs que batem, por tabela/colunas fixas do call-site (nunca SQL
 * dinâmico de coluna — só o termo vira parâmetro $1 via $queryRawUnsafe;
 * LIKE-escapes de %/_ aplicados no termo).
 */

// Alinhamento 1:1 por posição (19 minúsculas + 19 maiúsculas):
// ACCENTED: áàâãä éèêë íï óôõö úü ç ñ | ÁÀÂÃÄ ÉÈÊË ÍÏ ÓÔÕÖ ÚÜ Ç Ñ
// PLAIN:    aaaaa eeee ii oooo uu c n | AAAAA EEEE II OOOO UU C N
export const ACCENTED = 'áàâãäéèêëíïóôõöúüçñÁÀÂÃÄÉÈÊËÍÏÓÔÕÖÚÜÇÑ';
export const PLAIN = 'aaaaaeeeeiioooouucnAAAAAEEEEIIOOOOUUCN';

export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => '\\' + c);
}

/** expressão SQL: translate(lower("col"), ...) — coluna É literal do call-site. */
export function accentLowerExpr(column: string): string {
  return `translate(lower(${column}), '${ACCENTED}', '${PLAIN}')`;
}

export interface RawSearchDb {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

/**
 * Executa a busca accent/case-insensível e devolve os IDs que batem.
 * softDeleteCol: quando a tabela tem soft-delete, filtra deletedAt IS NULL.
 */
export async function searchMatchedIds(
  db: RawSearchDb,
  table: 'clubs' | 'players' | 'competitions',
  columns: string[],
  term: string,
  opts: { softDeleteCol?: string } = {},
): Promise<string[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const pattern = `%${escapeLike(trimmed.toLowerCase())}%`;
  const likeParts = columns
    .map((col) => `${accentLowerExpr(`"${col}"`)} LIKE ${accentLowerExpr('$1')} ESCAPE '\\'`)
    .join(' OR ');
  const whereSoft = opts.softDeleteCol ? `"${opts.softDeleteCol}" IS NULL AND ` : '';
  const sql = `SELECT "id" FROM "${table}" WHERE ${whereSoft}(${likeParts})`;
  const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(sql, pattern);
  return rows.map((r) => r.id);
}

/** Condição de busca Prisma para usar com os IDs retornados (vazio = nenhum resultado). */
export function idsInCondition(ids: string[]): { id: { in: string[] } } {
  return { id: { in: ids.length > 0 ? ids : ['00000000-0000-4000-8000-000000000000'] } };
}
