/**
 * T522 — Agregação de GOLS POR JOGADOR a partir do campo `matches.scorers`.
 *
 * PURO (sem I/O): recebe as linhas de partida com o texto bruto dos autores e uma
 * função de resolução `nome → jogador do acervo`. A resolução é injetada porque
 * depende do banco (e de curadoria); aqui só vive a lógica determinística.
 *
 * Honestidade (o que este módulo NÃO faz):
 *  - não inventa partidas jogadas: a única base que a fonte dá é o jogo em que o
 *    jogador marcou — `scoringMatches` é isso, não "aparições";
 *  - não inventa assistências (a fonte não as imprime) — ficam fora da conta;
 *  - **gol contra (`og`) não conta para o autor** (o gol é do adversário): é
 *    contabilizado à parte só para auditoria;
 *  - nome sem resolução inequívoca é DESCARTADO (vira gap), nunca "aproximado".
 *
 * A gramática do texto bruto é a v2 do parser (`penano`/`pen`/`og` no minuto,
 * `[Pedro 7pen, 90]` = dois gols do Pedro) — por isso a agregação RE-PARSEIA o
 * `raw` em vez de confiar nas listas `home`/`away` gravadas pelo T519 (que usavam
 * a gramática v1). Isso mantém as partidas aplicadas intocadas.
 */
import { parseScorers, type RsssfScorer } from '../rsssf/match-parser.js';

export interface ScorerMatchRow {
  id: string;
  competitionId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  scorersRaw: string | null;
  sourceUrl: string | null;
  importedFrom: string | null;
}

export interface CandidatePlayer {
  id: string;
  fullName: string;
  country: string | null;
  position: string | null;
  birthDate: Date | null;
  qid: string | null;
}

export interface PlayerGoals {
  playerId: string;
  fullName: string;
  /** Gols válidos (marca própria), excluindo `og`. */
  goals: number;
  /** Partidas em que o jogador marcou — a base auditável deste dado. */
  scoringMatches: number;
  /** Gols contra marcados pelo jogador (não contam; auditoria). */
  ownGoals: number;
  /** Ids de competição em que marcou. */
  competitions: string[];
  /** Fontes (URLs das partidas) — proveniência por jogador. */
  sourceUrls: string[];
}

export interface AggregationResult {
  players: PlayerGoals[];
  /** Nome → nº de gols que ficaram de fora por falta de resolução. */
  unresolved: Map<string, number>;
  /** Quantos gols contra foram excluídos da conta (auditoria). */
  ownGoalsExcluded: number;
}

/**
 * Plausibilidade de um autor de gol. Quem marca numa partida de 2023 não é
 * goleiro (salvo pênalti, que preferimos perder a atribuir errado) e não nasceu
 * antes de 1980. Sem isso, um match exato de nome pode escolher o HOMÔNIMO errado
 * — foi o caso de "Everaldo" (o acervo tem o Everaldo de 1944) e de "Fábio"
 * (goleiro de 1980).
 */
export const MIN_SCORER_BIRTH_YEAR = 1980;

export function isPlausibleScorer(
  p: Pick<CandidatePlayer, 'position' | 'birthDate'>,
  matchYear = 2023,
): boolean {
  if (p.position && p.position.toUpperCase().includes('GOALKEEPER')) return false;
  if (p.birthDate) {
    const year = p.birthDate.getUTCFullYear();
    if (year < MIN_SCORER_BIRTH_YEAR) return false;
    if (year > matchYear - 15) return false; // com 15 anos não se marca no profissional
  }
  return true;
}

export function normalizePlayerName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Aliases curados: como a FONTE imprime → `fullName` do acervo. Só entram casos
 * em que o acervo usa um nome mais longo (`Ayrton Lucas` → `Ayrton Lucas Dantas
 * de Medeiros`) ou um apelido (`Gabriel Barbosa` → `Gabigol`). A identidade foi
 * corroborada por posição e data de nascimento na base — nomes ambíguos
 * (Artur, Lima, Luciano, Paulinho, Wanderson) ficam FORA: preferimos o gap.
 */
export const SCORER_ALIASES: Record<string, string> = {
  'Ayrton Lucas': 'Ayrton Lucas Dantas de Medeiros',
  Everaldo: 'Everaldo Stum',
  Ganso: 'Paulo Henrique Ganso',
  Pedro: 'Pedro Guilherme Abreu dos Santos',
  'Gabriel Barbosa': 'Gabigol',
  'Roger Guedes': 'Roger Guedes',
};

export interface ResolveContext {
  /** Candidatos por nome normalizado (o chamador carrega do banco). */
  byNormalizedName: Map<string, CandidatePlayer[]>;
  matchYear?: number;
}

/**
 * Resolve um nome de autor de gol: tenta o alias, depois o nome literal; exige
 * candidato PLAUSÍVEL e ÚNICO. Empate ou ausência → null (gap declarado).
 */
export function resolveScorer(name: string, ctx: ResolveContext): CandidatePlayer | null {
  const year = ctx.matchYear ?? 2023;
  const tryName = (raw: string): CandidatePlayer | null => {
    const key = normalizePlayerName(raw);
    const cands = (ctx.byNormalizedName.get(key) ?? []).filter((c) => isPlausibleScorer(c, year));
    return cands.length === 1 ? cands[0] : null;
  };
  const alias = SCORER_ALIASES[name];
  if (alias) {
    const viaAlias = tryName(alias);
    if (viaAlias) return viaAlias;
  }
  return tryName(name);
}

/** Agrega gols por jogador a partir das partidas com `scorers.raw`. */
export function aggregatePlayerGoals(
  matches: ScorerMatchRow[],
  ctx: ResolveContext,
): AggregationResult {
  const byPlayer = new Map<string, PlayerGoals & { _comp: Set<string>; _src: Set<string> }>();
  const unresolved = new Map<string, number>();
  let ownGoalsExcluded = 0;

  for (const m of matches) {
    if (!m.scorersRaw) continue;
    const parsed = parseScorers(m.scorersRaw, m.homeScore ?? -1, m.awayScore ?? -1);
    const all: RsssfScorer[] = [...parsed.home, ...parsed.away];
    // Uma partida conta no máximo uma vez por jogador (base = jogos em que marcou).
    const scorersThisMatch = new Set<string>();
    for (const entry of all) {
      if (entry.ownGoal) {
        ownGoalsExcluded += 1; // gol contra: o autor não "marcou" a favor
        continue;
      }
      const player = resolveScorer(entry.player, ctx);
      if (!player) {
        unresolved.set(entry.player, (unresolved.get(entry.player) ?? 0) + 1);
        continue;
      }
      let agg = byPlayer.get(player.id);
      if (!agg) {
        agg = {
          playerId: player.id,
          fullName: player.fullName,
          goals: 0,
          scoringMatches: 0,
          ownGoals: 0,
          competitions: [],
          sourceUrls: [],
          _comp: new Set<string>(),
          _src: new Set<string>(),
        };
        byPlayer.set(player.id, agg);
      }
      agg.goals += 1;
      if (m.competitionId) agg._comp.add(m.competitionId);
      if (m.sourceUrl) agg._src.add(m.sourceUrl);
      if (!scorersThisMatch.has(player.id)) {
        scorersThisMatch.add(player.id);
        agg.scoringMatches += 1;
      }
    }
  }

  const players = [...byPlayer.values()].map(({ _comp, _src, ...rest }) => ({
    ...rest,
    competitions: [..._comp].sort(),
    sourceUrls: [..._src].sort(),
  }));
  players.sort((a, b) => b.goals - a.goals || a.fullName.localeCompare(b.fullName));
  return { players, unresolved, ownGoalsExcluded };
}
