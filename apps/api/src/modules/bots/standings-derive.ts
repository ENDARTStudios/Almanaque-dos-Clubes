/**
 * T-24/28 — DERIVAÇÃO DE CLASSIFICAÇÃO (standings) A PARTIR DAS PARTIDAS.
 *
 * ── O PROBLEMA ────────────────────────────────────────────────────────────────────────────
 * 36 das 114 edições (`CompetitionSeason`) estão sem `standings` (NULL ou array vazio) — mas
 * o acervo tem partidas com placar (`matches`, status FINISHED). Para edições cujo FORMATO
 * permite tabela (liga de pontos corridos; fase de grupos identificável por rodada), derivar
 * das partidas é honesto — desde que a proveniência seja declarada e a reversibilidade exista.
 *
 * ── O QUE NUNCA É DERIVADO ────────────────────────────────────────────────────────────────
 *   - Copa/mata-mata sem fase de grupos identificável: "tabela geral" de copa é mentira
 *     estatística (eliminação não soma pontos). Skip declarado com contagens.
 *   - Recorte incompleto: se metade dos clubes tem 30 jogos e metade tem 4, as partidas do
 *     recorte não sustentam tabela (guard de uniformidade). Skip declarado.
 *   - Clube/edição sem ano na label, janela ambígua entre edições da mesma competição.
 *
 * ── SHAPE (compatibilidade com o consumidor web) ──────────────────────────────────────────
 * O front (`apps/web/src/app/competitions/[id]/page.tsx` + `derive.ts`) espera `standings`
 * como ARRAY de linhas `{position, clubName, matchedName, clubId, played, won, drawn, lost,
 * goalsFor, goalsAgainst, points}` (`standings.length`, `normalizeStandings`). O objeto
 * `{rows, provenance}` sugerido inicialmente QUEBRARIA `standings.length` — por isso a
 * proveniência vai EMBUTIDA EM CADA LINHA (`row.provenance`), campo ignorado pelo front.
 * Linhas de fase de grupos carregam `group` (mesmo contrato do parser T510).
 *
 * ── COMO REVERTER (proveniência por linha) ────────────────────────────────────────────────
 *   UPDATE "CompetitionSeason" SET standings = NULL
 *    WHERE standings->0->'provenance'->>'source' = 'matches-derived';
 *
 * ── ZERO-OVERWRITE ────────────────────────────────────────────────────────────────────────
 * Só escreve quando `standings` é NULL/'null'/array vazio — checado de novo no UPDATE
 * (atômico). Re-run = noop: quem foi preenchido sai da fila sozinho.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import { yearFromSeasonLabel } from '../competitions/insights.js';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Partida mínima para derivação (já vem do acervo; `status` é o enum como texto). */
export interface DeriveMatch {
  round: string | null;
  date: Date;
  /** Nome da Season vinculada (`matches.seasonId → seasons.name`), se houver. */
  seasonName: string | null;
  homeClubId: string;
  awayClubId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

export type ClubNameMap = Map<string, string>;

/** Linha de standings no shape do T510 + proveniência por linha. */
export interface DerivedStandingRow {
  position: number;
  clubName: string;
  clubId: string;
  matchedName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  /** Presente só em tabela de fase de grupos (mesmo contrato do parser T510). */
  group?: string;
  provenance: {
    source: 'matches-derived';
    matchesConsidered: number;
    derivedAt: string;
    note: string;
  };
}

export type DeriveSkipReason =
  | 'sem-partidas-com-placar'
  | 'label-sem-ano'
  | 'janela-ambigua'
  | 'tipo-competicao-desconhecido'
  | 'copa-sem-grupos-identificaveis'
  | 'clubes-ou-jogos-insuficientes'
  | 'recorte-incompleto';

export type DeriveDecision =
  | {
      status: 'derived';
      rows: DerivedStandingRow[];
      linkage: 'season-name' | 'year-window';
      matchesConsidered: number;
      groups: string[] | null;
    }
  | {
      status: 'skip';
      reason: DeriveSkipReason;
      linkage: 'season-name' | 'year-window' | 'none';
      detail: Record<string, number | string>;
    };

// ---------------------------------------------------------------------------
// Parâmetros de plausibilidade (declarados — não mágicos)
// ---------------------------------------------------------------------------
/** Cada clube precisa de ao menos este nº de jogos para a tabela fazer sentido. */
export const MIN_JOGOS_POR_CLUBE = 3;
/** Menos que isto não é uma chave/classificação — é um recorte. */
export const MIN_CLUBES = 4;
/** Uniformidade: o clube com MAIS jogos não pode ter o dobro+ do que tem MENOS. */
export const MAX_RAZAO_JOGOS = 2;
/** Fração mínima de partidas (com placar) que precisa estar em rodada de grupo. */
export const MIN_PARTE_EM_GRUPOS = 0.6;

export const PROVENANCE_NOTE =
  'Classificação derivada das partidas do acervo (3 pts por vitória; desempate pts→saldo→gols pró→nome).';

const PONTOS_POR_VITORIA = 3;

/** Rodada que identifica grupo: "Group A", "Grupo B", "Gruppe C", "Groupe D"... */
const GROUP_ROUND_RE = /^(?:group|grupo|gruppe|groupe|grupa|groep)\s+([A-Za-z0-9]{1,3})$/i;

/** Partida utilizável: FINISHED e com placar nos dois lados (ausência não vira 0×0). */
function utilizavel(m: DeriveMatch): m is DeriveMatch & { homeScore: number; awayScore: number } {
  return (
    m.status === 'FINISHED' &&
    typeof m.homeScore === 'number' &&
    Number.isFinite(m.homeScore) &&
    typeof m.awayScore === 'number' &&
    Number.isFinite(m.awayScore)
  );
}

/**
 * Zero-overwrite: `standings` é gravável só quando NULL, JSON null, ou array vazio.
 * Qualquer OUTRO valor (array com linhas, objeto inesperado) NUNCA é tocado.
 */
export function hasNoStandings(standings: unknown): boolean {
  if (standings == null) return true;
  if (Array.isArray(standings)) return standings.length === 0;
  return false;
}

/**
 * Janela de anos de uma edição a partir da label: "2023" → [2023,2023];
 * "2023-24"/"2020-2021" → [2023,2024] / [2020,2021]; "2021 Aper" → [2021,2021].
 * Label sem ano → null (skip declarado).
 */
export function windowFromLabel(label: string): [number, number] | null {
  const year = yearFromSeasonLabel(label);
  if (year == null) return null;
  const range = /(\d{4})\s*[/–—-]\s*(\d{2,4})/.exec(label ?? '');
  if (range) {
    const raw = range[2] ?? '';
    // "2023-24" → século herdado do primeiro ano; "2020-2021" → direto.
    const end = raw.length === 4 ? Number(raw) : Math.floor(year / 100) * 100 + Number(raw);
    if (Number.isInteger(end) && end > year && end <= year + 3) return [year, end];
  }
  return [year, year];
}

/**
 * Seleciona as partidas de UMA edição: preferência por vínculo exato de temporada
 * (`matches.season.name === label`); sem vínculo, janela de anos por `date`,
 * EXCLUINDO partidas cuja season-name pertence a OUTRA edição da mesma competição.
 */
export function selectEditionMatches(
  label: string,
  otherLabels: ReadonlySet<string>,
  matches: readonly DeriveMatch[],
): { linkage: 'season-name' | 'year-window' | 'none'; matches: DeriveMatch[] } {
  const porNome = matches.filter((m) => m.seasonName === label);
  if (porNome.length > 0) return { linkage: 'season-name', matches: porNome };

  const window = windowFromLabel(label);
  if (!window) return { linkage: 'none', matches: [] };
  const porAno = matches.filter((m) => {
    // Partida vinculada a outra edição da MESMA competição não vira desta.
    if (m.seasonName != null && m.seasonName !== label && otherLabels.has(m.seasonName)) {
      return false;
    }
    const y = m.date.getUTCFullYear();
    return y >= window[0] && y <= window[1];
  });
  return { linkage: 'year-window', matches: porAno };
}

/** Separa partidas com placar em grupos identificados pela rodada. */
export function splitByGroups(matches: readonly DeriveMatch[]): {
  groups: Map<string, DeriveMatch[]>;
  groupedCount: number;
  otherCount: number;
} {
  const groups = new Map<string, DeriveMatch[]>();
  let otherCount = 0;
  for (const m of matches) {
    const g = m.round ? GROUP_ROUND_RE.exec(m.round.trim()) : null;
    if (!g) {
      otherCount += 1;
      continue;
    }
    // Chave canônica: letra/número em maiúsculas ("Group a" === "Group A").
    const key = (g[1] ?? '').toUpperCase();
    const bucket = groups.get(key);
    if (bucket) bucket.push(m);
    else groups.set(key, [m]);
  }
  return { groups, groupedCount: matches.length - otherCount, otherCount };
}

interface Acumulado {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Agregação W/D/L de partidas → tabela ordenada (pts → saldo → gols pró → NOME do clube).
 * `clubNames` resolve o nome real do acervo; clube sem nome cai no id (e a tabela segue
 * válida — o front mostra o id em vez de inventar nome).
 *
 * NOTA DE NÃO-REÚSO: `competitions/match-stats.ts#buildTable` agrega igual, mas devolve
 * `{wins, draws, losses}` e desempata por `clubId`; o shape do seed T510 (que o front lê)
 * é `{won, drawn, lost}` e o desempate declarado aqui é por NOME.
 */
export function aggregateStandings(
  matches: readonly DeriveMatch[],
  clubNames: ClubNameMap,
): Array<Omit<DerivedStandingRow, 'provenance' | 'group'>> {
  const porClube = new Map<string, Acumulado>();
  const pegar = (id: string): Acumulado => {
    const atual = porClube.get(id);
    if (atual) return atual;
    const novo: Acumulado = {
      clubId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
    porClube.set(id, novo);
    return novo;
  };

  for (const m of matches) {
    if (!utilizavel(m)) continue;
    const casa = pegar(m.homeClubId);
    const fora = pegar(m.awayClubId);
    casa.played += 1;
    fora.played += 1;
    casa.goalsFor += m.homeScore;
    casa.goalsAgainst += m.awayScore;
    fora.goalsFor += m.awayScore;
    fora.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      casa.won += 1;
      fora.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      fora.won += 1;
      casa.lost += 1;
    } else {
      casa.drawn += 1;
      fora.drawn += 1;
    }
  }

  const nome = (id: string) => clubNames.get(id) ?? id;
  const pontos = (c: Acumulado) => c.won * PONTOS_POR_VITORIA + c.drawn;
  return [...porClube.values()]
    .sort((a, b) => {
      const pa = pontos(a);
      const pb = pontos(b);
      if (pb !== pa) return pb - pa;
      const sa = a.goalsFor - a.goalsAgainst;
      const sb = b.goalsFor - b.goalsAgainst;
      if (sb !== sa) return sb - sa;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      // Último critério: nome real do acervo (id como fallback determinístico).
      const na = nome(a.clubId);
      const nb = nome(b.clubId);
      return na < nb ? -1 : na > nb ? 1 : a.clubId < b.clubId ? -1 : 1;
    })
    .map((c, i) => ({
      position: i + 1,
      clubName: nome(c.clubId),
      clubId: c.clubId,
      matchedName: nome(c.clubId),
      played: c.played,
      won: c.won,
      drawn: c.drawn,
      lost: c.lost,
      goalsFor: c.goalsFor,
      goalsAgainst: c.goalsAgainst,
      points: pontos(c),
    }));
}

/** Guard de plausibilidade: clubes suficientes, jogos por clube e recorte uniforme. */
export function checkPlausibility(rows: ReadonlyArray<{ played: number }>): {
  ok: boolean;
  detail: Record<string, number>;
} {
  const played = rows.map((r) => r.played);
  const min = played.length > 0 ? Math.min(...played) : 0;
  const max = played.length > 0 ? Math.max(...played) : 0;
  const detail = { clubs: rows.length, minPlayed: min, maxPlayed: max };
  if (rows.length < MIN_CLUBES || min < MIN_JOGOS_POR_CLUBE) {
    return { ok: false, detail };
  }
  if (max > min * MAX_RAZAO_JOGOS) {
    return { ok: false, detail };
  }
  return { ok: true, detail };
}

function provenance(matchesConsidered: number, derivedAt: Date): DerivedStandingRow['provenance'] {
  return {
    source: 'matches-derived',
    matchesConsidered,
    derivedAt: derivedAt.toISOString(),
    note: PROVENANCE_NOTE,
  };
}

/**
 * Deriva a classificação de UMA edição a partir das partidas, ou devolve skip declarado.
 *
 * LEAGUE → tabela única. CUP/TOURNAMENT/SUPER_CUP → só se a fase de grupos for
 * identificável pela rodada (≥2 grupos e ≥MIN_PARTE_EM_GRUPOS das partidas em grupos);
 * tabela combinada com `group` por linha (mesmo contrato do parser T510).
 */
export function deriveStandingsForEdition(input: {
  competitionType: string | null;
  seasonLabel: string;
  otherLabels: ReadonlySet<string>;
  matches: readonly DeriveMatch[];
  clubNames: ClubNameMap;
  derivedAt: Date;
}): DeriveDecision {
  const { competitionType, seasonLabel, otherLabels, clubNames, derivedAt } = input;
  const comPlacar = input.matches.filter((m) => m.homeScore != null && m.awayScore != null);
  const base = { matchesComPlacar: comPlacar.length, matchesTotal: input.matches.length };
  if (comPlacar.length === 0) {
    return {
      status: 'skip',
      reason: 'sem-partidas-com-placar',
      linkage: 'none',
      detail: base,
    };
  }

  const selecion = selectEditionMatches(seasonLabel, otherLabels, comPlacar);
  if (selecion.linkage === 'none' || selecion.matches.length === 0) {
    return {
      status: 'skip',
      reason: 'label-sem-ano',
      linkage: selecion.linkage,
      detail: { ...base, seasonLabel },
    };
  }
  const candidatas = selecion.matches.filter(utilizavel);
  if (candidatas.length === 0) {
    return {
      status: 'skip',
      reason: 'sem-partidas-com-placar',
      linkage: selecion.linkage,
      detail: { ...base, seasonLabel },
    };
  }

  if (competitionType !== 'LEAGUE') {
    // Copa/torneio: só fase de grupos identificável — tabela geral de copa é mentira.
    if (competitionType == null) {
      return {
        status: 'skip',
        reason: 'tipo-competicao-desconhecido',
        linkage: selecion.linkage,
        detail: base,
      };
    }
    const { groups, groupedCount } = splitByGroups(candidatas);
    const utilGroups = [...groups.entries()].filter(([, ms]) => ms.filter(utilizavel).length > 0);
    if (utilGroups.length < 2 || groupedCount < candidatas.length * MIN_PARTE_EM_GRUPOS) {
      return {
        status: 'skip',
        reason: 'copa-sem-grupos-identificaveis',
        linkage: selecion.linkage,
        detail: {
          ...base,
          gruposDetectados: utilGroups.length,
          partidasEmGrupos: groupedCount,
        },
      };
    }

    const rows: DerivedStandingRow[] = [];
    for (const [group, ms] of utilGroups.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      const tabela = aggregateStandings(ms, clubNames);
      const plaus = checkPlausibility(tabela);
      if (!plaus.ok) {
        return {
          status: 'skip',
          reason:
            plaus.detail.clubs < MIN_CLUBES || plaus.detail.minPlayed < MIN_JOGOS_POR_CLUBE
              ? 'clubes-ou-jogos-insuficientes'
              : 'recorte-incompleto',
          linkage: selecion.linkage,
          detail: { ...base, grupo: group, ...plaus.detail },
        };
      }
      for (const row of tabela) {
        rows.push({
          ...row,
          group,
          provenance: provenance(ms.filter(utilizavel).length, derivedAt),
        });
      }
    }
    return {
      status: 'derived',
      rows,
      linkage: selecion.linkage,
      matchesConsidered: groupedCount,
      groups: utilGroups.map(([g]) => g),
    };
  }

  // LEAGUE — tabela única de pontos corridos.
  const tabela = aggregateStandings(candidatas, clubNames);
  const plaus = checkPlausibility(tabela);
  if (!plaus.ok) {
    return {
      status: 'skip',
      reason:
        plaus.detail.clubs < MIN_CLUBES || plaus.detail.minPlayed < MIN_JOGOS_POR_CLUBE
          ? 'clubes-ou-jogos-insuficientes'
          : 'recorte-incompleto',
      linkage: selecion.linkage,
      detail: { ...base, ...plaus.detail },
    };
  }
  return {
    status: 'derived',
    rows: tabela.map((row) => ({ ...row, provenance: provenance(candidatas.length, derivedAt) })),
    linkage: selecion.linkage,
    matchesConsidered: candidatas.length,
    groups: null,
  };
}

// ---------------------------------------------------------------------------
// Lote do bot `tables` (I/O de verdade aqui; o resto acima é puro e testado)
// ---------------------------------------------------------------------------

/** Limite default de edições derivadas por ciclo do bot. */
export const DERIVE_BATCH_LIMIT = 20;

export interface DeriveBatchOutcome {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
}

interface EdicaoFila {
  id: string;
  competitionId: string;
  season: string;
  competitionType: string | null;
}

/**
 * Lote do bot `tables`: procura edições sem standings cujas partidas permitam derivação
 * honesta, deriva até `limit` por ciclo e grava com proveniência (zero-overwrite atômico).
 */
export async function deriveStandingsBatch(
  prisma: PrismaClient,
  opts: { limit?: number; now?: Date } = {},
): Promise<DeriveBatchOutcome> {
  const limit = opts.limit ?? DERIVE_BATCH_LIMIT;
  const derivedAt = opts.now ?? new Date();
  const edicoes = await prisma.$queryRaw<EdicaoFila[]>(Prisma.sql`
    SELECT cs.id,
           cs."competitionId" AS "competitionId",
           cs.season,
           c.type             AS "competitionType"
      FROM "CompetitionSeason" cs
      JOIN "Competition" c ON c.id = cs."competitionId"
     WHERE cs.standings IS NULL
        OR jsonb_typeof(cs.standings) = 'null'
        OR (jsonb_typeof(cs.standings) = 'array' AND jsonb_array_length(cs.standings) = 0)
     ORDER BY cs."competitionId", cs.season
     LIMIT ${limit}
  `);
  if (edicoes.length === 0) {
    return {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      message: 'classificações: nenhuma edição sem standings na fila — nada a derivar',
    };
  }

  // Agrupa por competição (uma query de partidas por competição, não por edição).
  const porCompeticao = new Map<string, EdicaoFila[]>();
  for (const e of edicoes) {
    const bucket = porCompeticao.get(e.competitionId);
    if (bucket) bucket.push(e);
    else porCompeticao.set(e.competitionId, [e]);
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const resumo: string[] = [];
  const motivos = new Map<string, number>();

  for (const [competitionId, grupo] of porCompeticao) {
    const matchesRaw = await prisma.match.findMany({
      where: { competitionId, homeScore: { not: null }, awayScore: { not: null } },
      select: {
        round: true,
        date: true,
        status: true,
        homeClubId: true,
        awayClubId: true,
        homeScore: true,
        awayScore: true,
        season: { select: { name: true } },
      },
    });
    const matches: DeriveMatch[] = matchesRaw.map((m) => ({
      round: m.round,
      date: m.date,
      seasonName: m.season?.name ?? null,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    }));

    // Clubes do acervo (nome real) — um único query por competição; o desempate
    // da tabela é por NOME, então precisam existir ANTES de derivar.
    const clubIds = [...new Set(matches.flatMap((m) => [m.homeClubId, m.awayClubId]))];
    const clubs = await prisma.club.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, name: true },
    });
    const clubNames: ClubNameMap = new Map(clubs.map((c) => [c.id, c.name]));

    const labels = new Set(grupo.map((e) => e.season));
    for (const edicao of grupo) {
      try {
        const others = new Set([...labels].filter((l) => l !== edicao.season));
        const decision = deriveStandingsForEdition({
          competitionType: edicao.competitionType,
          seasonLabel: edicao.season,
          otherLabels: others,
          matches,
          clubNames,
          derivedAt,
        });
        if (decision.status === 'skip') {
          skipped += 1;
          motivos.set(decision.reason, (motivos.get(decision.reason) ?? 0) + 1);
          resumo.push(
            `${edicao.season}: skip (${decision.reason}; ${JSON.stringify(decision.detail)})`,
          );
          continue;
        }

        // Nomes reais já resolvidos no aggregateStandings (desempate por nome).
        const rows = decision.rows;

        // Zero-overwrite ATÔMICO: o UPDATE só alcança a linha se standings ainda estiver vazio.
        const escritos = await prisma.$executeRaw`
          UPDATE "CompetitionSeason"
             SET standings = ${JSON.stringify(rows)}::jsonb,
                 "updatedAt" = now()
           WHERE id = ${edicao.id}
             AND (standings IS NULL
                  OR jsonb_typeof(standings) = 'null'
                  OR (jsonb_typeof(standings) = 'array' AND jsonb_array_length(standings) = 0))
        `;
        if (escritos === 1) {
          updated += 1;
          resumo.push(
            `${edicao.season}: ${rows.length} linha(s) derivadas de ${decision.matchesConsidered} partida(s)` +
              (decision.groups ? `, grupos ${decision.groups.join('/')}` : ''),
          );
        } else {
          skipped += 1;
          motivos.set(
            'standings-preenchido-em-corrida',
            (motivos.get('standings-preenchido-em-corrida') ?? 0) + 1,
          );
          resumo.push(`${edicao.season}: standings preenchido por outro processo (noop)`);
        }
      } catch (err) {
        errors += 1;
        resumo.push(`${edicao.season}: erro — ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const motivoTxt = [...motivos.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${r}=${n}`)
    .join(', ');
  return {
    processed: edicoes.length,
    updated,
    skipped,
    errors,
    message:
      `classificações: ${edicoes.length} edição(ões) na fila, ${updated} derivada(s) das ` +
      `partidas (proveniência matches-derived), ${skipped} skip, ${errors} erro(s)` +
      (motivoTxt ? `; skips: ${motivoTxt}` : ''),
  };
}
