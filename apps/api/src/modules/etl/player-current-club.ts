/**
 * T551 — "clube atual" de um jogador a partir do P54 (member of sports team) do Wikidata.
 *
 * Isto é uma INFERÊNCIA a partir de um campo que não é "clube atual": o P54 é a lista de
 * times por que o jogador passou. A regra fica escrita porque a diferença importa:
 *
 *  - Vale só o statement de P54 **sem P582 (fim)** — contrato em aberto.
 *  - Havendo mais de um em aberto (troca de clube sem atualizar o anterior), vence o de
 *    **P580 (início) mais recente**.
 *  - Jogador aposentado (todo P54 com P582) → `null`: não tem clube atual, e gravar o
 *    último clube como se fosse o atual seria dado falso.
 *  - Empréstimo que tem P582 (fim do empréstimo) fica fora → reporta-se o clube detentor.
 *  - Statement sem entidade de time (novalue/somevalue) é ignorado.
 */
export interface P54StatementLike {
  mainsnak?: { datavalue?: { value?: unknown } };
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
}

/** '+2009-01-01T00:00:00Z' → '2009-01-01'; null se o qualifier não for data. */
function qualifierTime(statement: P54StatementLike, pid: string): string | null {
  const v = statement.qualifiers?.[pid]?.[0]?.datavalue?.value;
  if (v == null || typeof v !== 'object') return null;
  const t = (v as { time?: unknown }).time;
  return typeof t === 'string' ? t.replace(/^\+/, '').slice(0, 10) : null;
}

function teamQid(statement: P54StatementLike): string | null {
  const v = statement.mainsnak?.datavalue?.value;
  if (v == null || typeof v !== 'object') return null;
  const id = (v as { id?: unknown }).id;
  return typeof id === 'string' && /^Q\d+$/.test(id) ? id : null;
}

/** QID do time atual, ou `null` se não houver contrato em aberto. */
export function currentTeamQid(statements: P54StatementLike[] | undefined): string | null {
  if (!statements || statements.length === 0) return null;
  let melhor: { qid: string; inicio: string } | null = null;
  for (const s of statements) {
    if (qualifierTime(s, 'P582') !== null) continue; // encerrado
    const qid = teamQid(s);
    if (qid === null) continue;
    const inicio = qualifierTime(s, 'P580') ?? '';
    if (melhor === null || inicio > melhor.inicio) melhor = { qid, inicio };
  }
  return melhor?.qid ?? null;
}
