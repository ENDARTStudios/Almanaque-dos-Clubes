/**
 * T551 — "clube atual" de um jogador a partir do P54 (member of sports team) do Wikidata.
 *
 * Isto é uma INFERÊNCIA — o P54 é o histórico de times, não o clube atual — e o dado de
 * origem tem falhas medidas. A regra e o porquê de cada corte:
 *
 *  1. vale só o statement **sem P582 (fim)** — contrato em aberto;
 *  2. o statement tem de ter **entidade de time** (QID): novalue/somevalue/string fica fora;
 *  3. o statement tem de ter **P580 (início)** — "aberto" sem data é, na prática, dado
 *     podre: o **Pelé** tem dois assim (morto em 2022, "contrato em aberto" de 1997);
 *  4. o P580 tem de estar **dentro da janela** (`maxAgeYears`, default 5). Sem isso, o
 *     **Diomande** — dois P54 "abertos" de **2015** (clubes antigos que ninguém encerrou) —
 *     publicaria "Hull City" como clube atual. Medido: 2 de 3 jogadores amostrados tinham
 *     "aberto" velho ou sem data;
 *  5. entre os elegíveis, vence o **P580 mais recente**.
 *
 * Se nada passa, devolve `null` — aposentado ou dado insuficiente **não** recebe clube
 * atual (gravar o último clube como se fosse o de hoje seria dado falso).
 *
 * Risco residual documentado: jogador que encerrou a carreira há pouco COM statement em
 * aberto iniciado dentro da janela ainda passa. Não há no Wikidata um marcador confiável
 * de "aposentado" (e `rank=preferred` não é usado: 0 de 4 jogadores verificados).
 */
export interface P54StatementLike {
  mainsnak?: { datavalue?: { value?: unknown } };
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
}

export interface CurrentTeamOptions {
  /** Janela de recência do P580, em anos (default 5). */
  maxAgeYears?: number;
  /** Injetável para teste determinístico. */
  now?: Date;
}

/** '+2009-01-01T00:00:00Z' → '2009-01-01' (a precisão pode ser só de ano: '2026-00-00'). */
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

/** QID do time atual, ou `null` se não houver contrato em aberto confiável. */
export function currentTeamQid(
  statements: P54StatementLike[] | undefined,
  opts: CurrentTeamOptions = {},
): string | null {
  if (!statements || statements.length === 0) return null;
  const maxAgeYears = opts.maxAgeYears ?? 5;
  const now = opts.now ?? new Date();
  const corte = new Date(
    Date.UTC(now.getUTCFullYear() - maxAgeYears, now.getUTCMonth(), now.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);

  let melhor: { qid: string; inicio: string } | null = null;
  for (const s of statements) {
    if (qualifierTime(s, 'P582') !== null) continue; // encerrado
    const qid = teamQid(s);
    if (qid === null) continue; // não é entidade
    const inicio = qualifierTime(s, 'P580');
    if (inicio === null) continue; // aberto sem data — não validável
    if (inicio < corte) continue; // aberto velho — dado incompleto na fonte
    if (melhor === null || inicio > melhor.inicio) melhor = { qid, inicio };
  }
  return melhor?.qid ?? null;
}
