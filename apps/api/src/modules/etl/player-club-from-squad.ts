/**
 * Derivação do clube ATUAL de um jogador a partir das arestas `PLAYED_FOR` do
 * knowledge graph — o dado que `ingest-players-squads` (T034) já grava, mas que
 * NUNCA foi escrito em `players."clubId"`.
 *
 * Isto é uma INFERÊNCIA sobre histórico de elencos, não um campo "clube atual" da
 * fonte. A regra e o porquê de cada corte:
 *
 *  1. **Só a aresta mais recente vale.** O grafo guarda a carreira inteira; pegar
 *     "qualquer clube" devolveria o time de 1981 como se fosse o de hoje.
 *  2. **Ano é o sinal de tempo.** `metadata.year` (gravado pela ingestão como
 *     `startYear ?? endYear`) — com fallback para `startYear`/`endYear` em arestas
 *     antigas. `year = 0` significa "vínculo sem ano" (honesto na origem) e NÃO
 *     entra: sem tempo não há como provar recência.
 *  3. **Janela de recência (`maxAgeYears`, default 2).** O ano da temporada é o de
 *     INÍCIO do contrato. Dois anos cobrem a temporada corrente + a imediatamente
 *     anterior, tolerando a defasagem do Wikidata sem ressuscitar um elenco de
 *     2015 como "clube atual". Medido em produção (17/10/2026): 1.455 jogadores
 *     sem clube têm aresta mais recente em 2024+, contra 3.189 numa janela de 5
 *     anos — a diferença é majoritariamente carreira encerrada, não elenco atual.
 *  4. **Só clube DO ACERVO** (`kind='club'`, `deletedAt IS NULL`). A aresta pode
 *     apontar para seleção, time juvenil ou clube que não ingerimos.
 *  5. **Empate no ano mais recente = ambíguo.** Dois clubes distintos na mesma
 *     temporada (empréstimo/transferência) não permitem dizer qual é o atual:
 *     `no_source`, sem chute.
 *  6. **Zero overwrite.** `currentClubId` preenchido (P54, T551, com proveniência
 *     própria) nunca é tocado — o chamador também filtra `clubId IS NULL` e a
 *     escrita usa `WHERE clubId IS NULL`.
 *
 * Toda saída carrega a proveniência `knowledge_graph:PLAYED_FOR` no registro do
 * cursor (`players.mediaEnrichment.clubFromSquad`) — inclusive `no_source`.
 */

export const SQUAD_CLUB_SOURCE = 'knowledge_graph:PLAYED_FOR';

/** Ano mínimo aceitável numa aresta (evita lixo tipo 12/1970). */
const ANO_MINIMO = 1900;

export interface PlayedForEdgeLike {
  targetId: string;
  metadata?: unknown;
}

export interface DeriveSquadClubOptions {
  /** IDs dos clubes do acervo (`kind='club'`, `deletedAt IS NULL`). */
  archiveClubIds: ReadonlySet<string>;
  /** Janela de recência, em anos (default 2). */
  maxAgeYears?: number;
  /** Injetável para teste determinístico. */
  now?: Date;
  /** Guarda de zero overwrite. */
  currentClubId?: string | null;
}

export type SquadClubNoSourceReason =
  | 'no_edge'
  | 'no_temporal_signal'
  | 'stale'
  | 'outside_archive'
  | 'ambiguous_latest'
  | 'already_linked';

export type DerivedSquadClub =
  | { status: 'linked'; clubId: string; year: number; source: typeof SQUAD_CLUB_SOURCE }
  | {
      status: 'no_source';
      reason: SquadClubNoSourceReason;
      year: number | null;
      source: typeof SQUAD_CLUB_SOURCE;
    };

/** Ano de uma aresta (`year` → `startYear` → `endYear`), ou `null` se não houver. */
export function edgeYear(metadata: unknown, now = new Date()): number | null {
  if (metadata === null || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const teto = now.getUTCFullYear() + 1; // temporada futura imediata é plausível; 3000 não
  for (const key of ['year', 'startYear', 'endYear']) {
    const raw = m[key];
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (Number.isInteger(n) && n >= ANO_MINIMO && n <= teto) return n;
  }
  return null;
}

/**
 * Decide o clube atual de UM jogador. Determinística e sem IO — o lote só injeta as
 * arestas e o conjunto de clubes do acervo.
 */
export function deriveClubFromSquadEdges(
  edges: PlayedForEdgeLike[],
  opts: DeriveSquadClubOptions,
): DerivedSquadClub {
  const source = SQUAD_CLUB_SOURCE;
  const maxAgeYears = opts.maxAgeYears ?? 2;
  const now = opts.now ?? new Date();

  if (opts.currentClubId) {
    return { status: 'no_source', reason: 'already_linked', year: null, source };
  }
  if (edges.length === 0) {
    return { status: 'no_source', reason: 'no_edge', year: null, source };
  }

  const datadas = edges
    .map((e) => ({ targetId: e.targetId, year: edgeYear(e.metadata, now) }))
    .filter((e): e is { targetId: string; year: number } => e.year !== null);
  if (datadas.length === 0) {
    return { status: 'no_source', reason: 'no_temporal_signal', year: null, source };
  }

  const anoMaisRecente = Math.max(...datadas.map((e) => e.year));
  const corte = now.getUTCFullYear() - maxAgeYears;
  if (anoMaisRecente < corte) {
    return { status: 'no_source', reason: 'stale', year: anoMaisRecente, source };
  }

  const alvos = [
    ...new Set(datadas.filter((e) => e.year === anoMaisRecente).map((e) => e.targetId)),
  ];
  if (alvos.length > 1) {
    return { status: 'no_source', reason: 'ambiguous_latest', year: anoMaisRecente, source };
  }

  const clubId = alvos[0];
  if (!opts.archiveClubIds.has(clubId)) {
    return { status: 'no_source', reason: 'outside_archive', year: anoMaisRecente, source };
  }

  return { status: 'linked', clubId, year: anoMaisRecente, source };
}
