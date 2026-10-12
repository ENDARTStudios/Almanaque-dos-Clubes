/**
 * T519 — Parser de PARTIDAS das páginas RSSSF (ligas e Libertadores).
 * PURO (sem I/O). Recebe o HTML JÁ decodificado (windows-1252 → string, via
 * `decodeLegacyBytes`) e devolve partidas com data, placar e (quando a fonte
 * imprime) autores dos gols.
 *
 * Por que este parser existe separado do `decode-legacy-table`:
 *  - as páginas têm VÁRIAS competições em blocos `<pre>` distintos; é preciso
 *    fatiar a competição certa (bloco 0 nas ligas) antes de ler as rodadas;
 *  - o ano NUNCA aparece no token de data (`[Apr 15]`); ele vem do contexto da
 *    página — temporada de ano único (BR/Libertadores) ou cruzada (PL);
 *  - a Libertadores usa um layout diferente (data inline `Apr 5: A - B 2-1`).
 *
 * Regras de honestidade (T519): nada é adivinhado. Placar ausente → linha não é
 * partida. Linha sem data → não entra (o modelo `Match.date` é obrigatório e
 * inventar data violaria D-2026-10-10). Marcador de nota da fonte (`x`/`y`) é
 * preservado como `sourceNote`, sem interpretação.
 */

import { htmlToText } from './decode-legacy-table.js';

export type RsssfSourceKind = 'league' | 'libertadores';

export interface RsssfScorer {
  player: string;
  /** "45+5" quando a fonte detalha acréscimos; null quando não imprime minuto. */
  minute: string | null;
  /** T520 — a fonte marca gol contra com o sufixo `og` (o gol é do ADVERSÁRIO). */
  ownGoal?: boolean;
  /** T520 — a fonte marca pênalti com o sufixo `pen`. */
  penalty?: boolean;
}

export interface RsssfScorers {
  raw: string;
  home: RsssfScorer[];
  away: RsssfScorer[];
  /** true quando a contagem de autores casa com o placar (validação cruzada). */
  sidesVerified: boolean;
}

export interface RsssfMatch {
  /** "1".."38" nas ligas; "Group A".."Group H"/"Final" na Libertadores. */
  round: string;
  /** Data como impressa ("Apr 15"), sem ano. */
  dateRaw: string;
  month: number;
  day: number;
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
  scorers: RsssfScorers | null;
  extraTime: boolean;
  /** Marcador de nota da fonte (ex.: `x`, `y` = estádio alternativo). Não decodificado. */
  sourceNote: string | null;
}

export interface RsssfParseResult {
  matches: RsssfMatch[];
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_RE = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';

/** Separa o HTML em blocos `<pre>` (cada competição vive em um bloco). */
export function splitPreBlocks(html: string): string[] {
  const parts = html.split(/<pre[^>]*>/i);
  parts.shift();
  return parts.map((p) => {
    const end = p.search(/<\/pre>/i);
    return end >= 0 ? p.slice(0, end) : p;
  });
}

/**
 * Escolhe o bloco da competição-alvo.
 * Ligas: bloco 0 (validado por conter `Round 1`); Libertadores: bloco único.
 */
export function selectCompetitionBlock(
  html: string,
  kind: RsssfSourceKind,
): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  const blocks = splitPreBlocks(html).map((b) => htmlToText(b));
  if (blocks.length === 0) return { text: '', warnings: ['no_pre_block'] };
  if (kind === 'libertadores') return { text: blocks[0], warnings };
  if (!/^\s*Round\s+1\b/m.test(blocks[0])) {
    // Fallback defensivo: procura o primeiro bloco com a rodada 1.
    const idx = blocks.findIndex((b) => /^\s*Round\s+1\b/m.test(b));
    if (idx < 0) {
      warnings.push('block_without_round_1');
      return { text: '', warnings };
    }
    warnings.push(`league_block_shifted:${idx}`);
    return { text: blocks[idx], warnings };
  }
  return { text: blocks[0], warnings };
}

/**
 * Regex de linha de jogo nas ligas: `Home  2-1 Away`.
 * O separador antes do placar aceita UM espaço: a coluna da fonte tem largura
 * fixa, então nomes longos (`Wolverhampton`, 13 letras) deixam só 1 espaço
 * (`Wolverhampton 1-4 Brighton`). Nomes com espaço simples não colidem porque
 * o `\s+\d+-\d+` só casa quando o que segue o espaço é um placar.
 */
const LEAGUE_MATCH_RE = /^(\S.*?)\s+(\d+)-(\d+)\s+(\S.*?)\s*$/;
/**
 * Cabeçalho de rodada; tolera anotações no colchete (`Round 7 [postponed from
 * Sep 10-12...]`) e data inline (`Round 38 [Feb 25]`).
 */
const ROUND_RE = /^Round\s+(\d+)(?:\s*\[([^\]]*)\])?\s*$/;
const DATE_LINE_RE = new RegExp(`^\\[\\s*${MONTH_RE}\\s+(\\d{1,2})\\s*\\]$`);
const SCORERS_RE = /^\s{2,}\[(.+)\]\s*$/;
/**
 * Linha de tabela: posição (dígito+dot) + a linha contém >= 2 sequências de
 * dígitos isoladas (jogos/ordem/etc). O guard por 'dígito+dot' sozinho quebraria
 * times cujo nome começa com número (`1.FC Köln`, `1.FSV Mainz 05`).
 */
function isTableRow(homeName: string): boolean {
  if (!/^\d+\./.test(homeName)) return false;
  const runs = homeName.match(/(?:^|\s)\d{1,3}(?=\s|$)/g);
  return (runs?.length ?? 0) >= 2;
}
/**
 * Nome contaminado pela SOBRA de uma anotação que a fonte quebrou em 2 linhas
 * (`Toulouse       crowd trouble; result stood]`, `São Paulo        trouble]`).
 * A fonte é de largura fixa: o fragmento de nota vem DEPOIS do último bloco de
 * 2+ espaços, então cortamos ali — cortar "no primeiro não-espaço antes do `]`"
 * comia o próprio nome quando ele tem espaço interno (virava "São" de "São Paulo").
 */
function cutNoteTail(name: string): string {
  const end = name.indexOf(']');
  if (end < 0) return name.trim();
  const head = name.slice(0, end);
  const gap = head.lastIndexOf('  ');
  return (gap >= 0 ? head.slice(0, gap) : head).trim();
}
/** A fonte marca jogo anormal no lugar do placar: `abd`/`awd` (ou a anotação). */
const ABANDONED_RE = /\babd\b|\bawd\b|\babandoned\b|\bawarded\b/i;
/** Notas inline da fonte que NÃO são autores de gol (anotação de local/replay). */
const NON_SCORER_NOTE_RE = /^(played in|replay|abandoned|match played|at\b)/i;
const BRACKET_RE = /\[([^\]]*)\]/g;

/**
 * Remove as anotações `[...]` de uma linha de jogo e devolve o texto limpo + as
 * notas. A fonte usa isso para local alternativo (`[played in Uberlândia-MG]`),
 * `[replay]` e para o jogo abandonado (`abd ... [abandoned at 1-1 in 65'...]`).
 * Remover a anotação ANTES do match é o que impede o "1-1" do texto corrido de
 * ser lido como placar (dado falso).
 */
export function stripNotes(line: string): { clean: string; notes: string[] } {
  const notes: string[] = [];
  // Anotação ABERTA (sem `]` de fechamento na mesma linha): a fonte quebra a nota
  // em 2 linhas físicas — Ligue 1 2024-25:
  //   `Montpellier   0-2 Saint-Etienne [abandoned at 0-2 in 62' due to`
  //   `Strasbourg    2-1 Toulouse       crowd trouble; result stood]`
  // Sem isso o `[...` viraria parte do nome do visitante (dado falso).
  const openAt = line.indexOf('[');
  let body = line;
  if (openAt >= 0 && line.indexOf(']', openAt) < 0) {
    const note = line.slice(openAt + 1).trim();
    if (note) notes.push(note);
    body = line.slice(0, openAt);
  }
  const clean = body.replace(BRACKET_RE, (_all, inner: string) => {
    const note = inner.trim();
    if (note) notes.push(note);
    return ' ';
  });
  // O espaçamento em si é significativo (a Libertadores separa time e placar por
  // 2+ espaços), então NÃO colapsamos as runs de espaço.
  return { clean: clean.trim(), notes };
}

/**
 * Parseia o bloco de uma liga (Brasileirão Série A / Premier League).
 * Só começa a ler depois do primeiro `Round N` — a tabela final que antecede as
 * rodadas contém tokens no formato `64-33` que colidiriam com placares.
 */
export function parseLeagueBlock(text: string): RsssfParseResult {
  const warnings: string[] = [];
  const matches: RsssfMatch[] = [];
  let started = false;
  let round: string | null = null;
  let date: { raw: string; month: number; day: number } | null = null;
  let last: RsssfMatch | null = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!started) {
      const r = ROUND_RE.exec(trimmed);
      if (!r) continue;
      started = true;
      round = r[1];
      const inline = /\b([A-Za-z]{3})\s+(\d{1,2})\b/.exec(r[2] ?? '');
      if (inline) date = monthDay(inline[1], inline[2]);
      continue;
    }

    const roundM = ROUND_RE.exec(trimmed);
    if (roundM) {
      // A rodada é gravada COMO A FONTE A IMPRIME. A antiga marca 'P{N}' (fase de
      // playoff) saiu: a barragem de acesso já fica fora pelo corte na tabela
      // final, e o rótulo inventado viraria dado falso quando a fonte lista
      // rodadas fora de ordem (a La Liga reordena jogos adiados entre rodadas).
      round = roundM[1];
      const inline = /\b([A-Za-z]{3})\s+(\d{1,2})\b/.exec(roundM[2] ?? '');
      if (inline) date = monthDay(inline[1], inline[2]);
      last = null;
      continue;
    }

    // Fim do round-robin: a fonte imprime a tabela final logo após a última rodada
    // e, depois dela, playoff/barragem de acesso-rebaixamento (Ligue 1/Bundesliga)
    // que envolve clubes da divisão DE BAIXO — fora do escopo da temporada desta
    // competição. A tabela final de ABERTURA (antes da rodada 1) é ignorada porque
    // o break só vale depois de `started`.
    if (/^Final Table\b/i.test(trimmed)) break;

    const dateM = DATE_LINE_RE.exec(trimmed);
    if (dateM) {
      date = monthDay(dateM[1], dateM[2]);
      last = null;
      continue;
    }

    const scorersM = SCORERS_RE.exec(line);
    if (scorersM && last && !NON_SCORER_NOTE_RE.test(scorersM[1].trim())) {
      last.scorers = parseScorers(scorersM[1], last.homeGoals, last.awayGoals);
      continue;
    }

    const { clean, notes } = stripNotes(trimmed);
    if (!clean) continue;

    const m = LEAGUE_MATCH_RE.exec(clean);
    if (!m) {
      // SEM placar na coluna: a fonte usou um marcador de jogo anormal (`abd`,
      // `awd`) ou `x`/`y`. Regra de honestidade: o placar final só entra se a
      // FONTE o imprimiu na coluna — deduzi-lo da anotação seria adivinhar.
      // Ex.: Bournemouth x Luton (PL 2023-24), Montpellier abd Clermont (L1
      // 2023-24), Union awd Bochum (BL 2024-25, decisão disciplinar).
      if (ABANDONED_RE.test(clean) || notes.some((n) => ABANDONED_RE.test(n))) {
        warnings.push(`abandoned_match:${clean}`);
      }
      continue;
    }
    {
      const homeName = cutNoteTail(m[1].trim());
      const awayName = cutNoteTail(m[4].trim());
      // Guarda contra linhas de tabela (ex.: "1.Palmeiras ... 64-33 70").
      if (isTableRow(homeName) || !/[A-Za-zÀ-ÿ]/.test(awayName)) continue;
      if (!date) {
        warnings.push(`match_without_date:${homeName} x ${awayName}`);
        continue;
      }
      if (!round) {
        warnings.push(`match_without_round:${homeName} x ${awayName}`);
        continue;
      }
      const match: RsssfMatch = {
        round,
        dateRaw: date.raw,
        month: date.month,
        day: date.day,
        homeName,
        awayName,
        homeGoals: Number(m[2]),
        awayGoals: Number(m[3]),
        scorers: null,
        extraTime: /\baet\b/i.test(clean),
        sourceNote: notes.length ? notes.join(' | ') : null,
      };
      matches.push(match);
      last = match;
      continue;
    }
  }

  return { matches, warnings };
}

/** Regex de jogo de grupo da Libertadores: `Apr  5: TimeA - TimeB    2-1[x]`. */
const GROUP_MATCH_RE = new RegExp(
  `^${MONTH_RE}\\s+(\\d{1,2}):\\s+(.+?)\\s{2,}(\\d+)-(\\d+)\\s*([xy])?\\s*$`,
);
/**
 * Título de seção de grupo. As páginas antigas (Libertadores 2015-2017) numeram os
 * grupos (`Group 1`..`Group 8`); as novas usam letra (`Group A`..`Group H`).
 */
const SECTION_RE = /^(Group\s+(?:[A-H]|\d+))\b/;
/**
 * Cabeçalho da final: `Final (Nov 4, Rio de Janeiro)`. NÃO ancorado no início
 * porque em copa2023 ele vem colado ao parêntese da semifinal anterior
 * (`(Sep 28 & Oct 5Nov 4, Rio de Janeiro)`).
 */
const FINAL_HEADER_RE = new RegExp(`\\bFinal\\s*\\(\\s*${MONTH_RE}\\s+(\\d{1,2})[^)]*\\)`);
/** Linha de mata-mata: `Boca Juniors   Arg  Fluminense FC  Bra  1-2  aet`. */
const KNOCKOUT_MATCH_RE =
  /^(.+?)\s{2,}([A-Z][a-z]{2})\s{2,}(.+?)\s{2,}([A-Z][a-z]{2})\s{2,}(\d+)-(\d+)\s*(aet)?\s*$/;

/**
 * Parseia o bloco único da Libertadores.
 * Grupos: jogos com data inline (ingestáveis). Mata-mata: linhas de AGREGAÇÃO
 * (dois jogos + agregado, sem data por jogo) → NÃO viram partidas (gap declarado).
 * A final é jogo único e tem data no cabeçalho `Final (Nov 4, Cidade)`.
 */
export function parseLibertadoresBlock(text: string): RsssfParseResult {
  const warnings: string[] = [];
  const matches: RsssfMatch[] = [];
  let section: string | null = null;
  let finalDate: { raw: string; month: number; day: number } | null = null;
  let last: RsssfMatch | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;

    const finalHeader = FINAL_HEADER_RE.exec(trimmed);
    if (finalHeader) {
      section = 'Final';
      finalDate = monthDay(finalHeader[1], finalHeader[2]);
      continue;
    }

    const sec = SECTION_RE.exec(trimmed);
    if (sec) {
      section = sec[1].replace(/\s+/, ' ');
      last = null;
      continue;
    }

    // Linhas de fase do mata-mata sem data por jogo (ex.: "(Aug 13 & 20)").
    if (/^\(.*&.*\)\s*$/.test(trimmed)) continue;

    const { clean, notes } = stripNotes(trimmed);

    const g = GROUP_MATCH_RE.exec(clean);
    if (g && section && /^Group\s/.test(section)) {
      const names = splitTeams(g[3]);
      if (!names) {
        warnings.push(`unparsable_teams:${trimmed}`);
        continue;
      }
      const noteParts = [...(g[6] ? [g[6]] : []), ...notes];
      const match: RsssfMatch = {
        round: section,
        dateRaw: `${g[1]} ${g[2]}`,
        month: MONTHS[g[1].toLowerCase()],
        day: Number(g[2]),
        homeName: names[0],
        awayName: names[1],
        homeGoals: Number(g[4]),
        awayGoals: Number(g[5]),
        scorers: null,
        extraTime: false,
        sourceNote: noteParts.length ? noteParts.join(' | ') : null,
      };
      matches.push(match);
      last = match;
      continue;
    }

    if (section === 'Final' && finalDate) {
      const k = KNOCKOUT_MATCH_RE.exec(clean);
      if (k) {
        const match: RsssfMatch = {
          round: 'Final',
          dateRaw: finalDate.raw,
          month: finalDate.month,
          day: finalDate.day,
          homeName: k[1].trim(),
          awayName: k[3].trim(),
          homeGoals: Number(k[5]),
          awayGoals: Number(k[6]),
          scorers: null,
          extraTime: Boolean(k[7]),
          sourceNote: notes.length ? notes.join(' | ') : null,
        };
        matches.push(match);
        last = match;
        continue;
      }
      // Linhas de agregação do mata-mata (vários placares) — ignoradas por desenho.
      if (last && /\d+-\d+\s+\d+-\d+/.test(clean)) continue;
    }
  }

  return { matches, warnings };
}

/** Dispatcher: escolhe o parser pelo tipo de fonte. */
export function parseRsssfMatches(html: string, opts: { kind: RsssfSourceKind }): RsssfParseResult {
  const { text, warnings } = selectCompetitionBlock(html, opts.kind);
  if (!text) return { matches: [], warnings };
  const parsed =
    opts.kind === 'libertadores' ? parseLibertadoresBlock(text) : parseLeagueBlock(text);
  return { matches: parsed.matches, warnings: [...warnings, ...parsed.warnings] };
}

export interface SeasonYearOptions {
  /** `single`: a temporada ocorre em um ano civil (BR, Libertadores). */
  mode: 'single' | 'cross';
  /** Ano da temporada (em `cross`, o ano de INÍCIO da temporada europeia). */
  year: number;
  /** Em `single`: meses <= spillAfter pertencem ao ano seguinte (BR 2020 → jan/fev 2021). */
  spillAfter?: number;
  /** Em `cross`: meses >= splitMonth pertencem ao ano de início (default 7 = julho). */
  splitMonth?: number;
}

/**
 * Resolve o ANO de uma data que a fonte imprime sem ano.
 * - `single`: ano = temporada (Série A e Libertadores correm dentro de um ano civil).
 * - `cross`: temporada europeia (ago→mai). Meses >= splitMonth → ano de início;
 *   anteriores → ano+1. Verificado em 2023-24: `[Aug 11]`=2023 e `[May 19]`=2024.
 */
export function resolveMatchYear(month: number, opts: SeasonYearOptions): number {
  if (opts.mode === 'single') {
    // Temporada que vaza para o ano seguinte (BR 2020/Covid: jan-fev de 2021).
    if (opts.spillAfter != null && month <= opts.spillAfter) return opts.year + 1;
    return opts.year;
  }
  const split = opts.splitMonth ?? 7;
  return month >= split ? opts.year : opts.year + 1;
}

/** Data ISO (UTC) a partir da partida + regra de ano. */
export function matchDate(match: RsssfMatch, opts: SeasonYearOptions): Date {
  const year = resolveMatchYear(match.month, opts);
  return new Date(Date.UTC(year, match.month - 1, match.day));
}

/**
 * T529 — ANO de uma temporada CRUZADA (europeia), resolvido por mês + rodada.
 *
 * O corte por mês resolve quase tudo, mas a Covid esticou a temporada 2019-20 até
 * agosto de 2020: a Serie A jogou de **24/ago/2019 a 2/ago/2020**, ou seja, o
 * MESMO mês (agosto) aparece nos dois extremos — nenhum limiar separa o começo do
 * fim. Na faixa ambígua (o mês do corte e o anterior) quem desempata é a RODADA:
 * rodada na segunda metade da temporada está no ano seguinte.
 *
 * Também não serve o fold ingênuo "o ano vira quando o mês volta": a fonte lista
 * jogos ADIADOS dentro da rodada original (`r16: Dec 13, Dec 13, Jan 20, r17: Dec 19`),
 * o que faria a virada ser contada duas vezes.
 *
 * Vale só para `mode: 'cross'`; ano civil (BR/Libertadores) usa `resolveMatchYear`.
 */
export function resolveCrossYears(
  matches: readonly { month: number; round: string }[],
  startYear: number,
  splitMonth = 8,
): number[] {
  const roundNumbers = matches
    .map((m) => Number.parseInt(m.round, 10))
    .filter((n) => Number.isFinite(n));
  const maxRound = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 0;
  return matches.map((m) => {
    if (m.month > splitMonth || m.month < splitMonth - 1) {
      // Fora da faixa ambígua: o mês decide (com corte em agosto, set-dez são do
      // ano de início e jan-jul do seguinte).
      return m.month >= splitMonth ? startYear : startYear + 1;
    }
    const n = Number.parseInt(m.round, 10);
    return maxRound > 0 && Number.isFinite(n) && n > maxRound / 2 ? startYear + 1 : startYear;
  });
}

/**
 * Autores dos gols. A fonte separa casa/fora por `;` — sem o `;` não há como
 * atribuir lado, então só o texto bruto é preservado (`sidesVerified: false`).
 */
export function parseScorers(raw: string, homeGoals: number, awayGoals: number): RsssfScorers {
  const parts = raw.split(';');
  const home: RsssfScorer[] = [];
  const away: RsssfScorer[] = [];
  let sidesKnown = false;
  if (parts.length === 2) {
    home.push(...splitScorers(parts[0]));
    away.push(...splitScorers(parts[1]));
    sidesKnown = true;
  } else if (parts.length === 1) {
    // A fonte omite o `;` quando um time não marcou: com 3-0 todos os autores
    // são do mandante. A atribuição vem do próprio placar impresso, não de chute.
    const all = splitScorers(parts[0]);
    if (awayGoals === 0 && homeGoals > 0) {
      home.push(...all);
      sidesKnown = true;
    } else if (homeGoals === 0 && awayGoals > 0) {
      away.push(...all);
      sidesKnown = true;
    }
  }
  return {
    raw: raw.trim(),
    home,
    away,
    sidesVerified: sidesKnown && home.length === homeGoals && away.length === awayGoals,
  };
}

/**
 * Autores de gol de um lado. A fonte usa `Nome 45+6pen` e, quando o MESMO jogador
 * volta a marcar, imprime só o minuto (`[Pedro 7pen, 90]` = dois gols do Pedro).
 * T520 — gramática corrigida: (a) o sufixo `pen`/`og` faz parte do MINUTO, não do
 * nome (antes "Tiquinho Soares 29pen" virava um "jogador" diferente de
 * "Tiquinho Soares", inflando os nomes distintos); (b) entrada só com minuto é
 * repetição do último jogador citado (antes o minuto era lido como jogador).
 */
function splitScorers(chunk: string): RsssfScorer[] {
  const text = chunk.trim();
  if (!text) return [];
  const out: RsssfScorer[] = [];
  let lastPlayer: string | null = null;
  for (const raw of text.split(',')) {
    const entry = raw.trim();
    if (!entry) continue;
    const m = /^(.*?)\s+(\d+(?:\+\d+)?)(pen|og)?$/i.exec(entry);
    if (m) {
      const player: string | null = m[1].trim() || lastPlayer;
      if (!player) continue;
      lastPlayer = player;
      out.push({
        player,
        minute: m[2],
        penalty: m[3]?.toLowerCase() === 'pen' || undefined,
        ownGoal: m[3]?.toLowerCase() === 'og' || undefined,
      });
      continue;
    }
    // Só o minuto (`90`, `56pen`) → repetição do último jogador.
    const only = /^(\d+(?:\+\d+)?)(pen|og)?$/i.exec(entry);
    if (only && lastPlayer) {
      out.push({
        player: lastPlayer,
        minute: only[1],
        penalty: only[2]?.toLowerCase() === 'pen' || undefined,
        ownGoal: only[2]?.toLowerCase() === 'og' || undefined,
      });
      continue;
    }
    out.push({ player: entry, minute: null });
    lastPlayer = entry;
  }
  return out;
}

function monthDay(
  monthTok: string,
  dayTok: string,
): {
  raw: string;
  month: number;
  day: number;
} {
  const month = MONTHS[monthTok.toLowerCase()];
  return { raw: `${monthTok} ${dayTok}`, month, day: Number(dayTok) };
}

/** Separa `TimeA - TimeB` (hífen, en-dash ou travessão — o 0x96 do cp1252 vira –). */
function splitTeams(input: string): [string, string] | null {
  const parts = input.split(/\s+[-–—]\s+/);
  if (parts.length !== 2) return null;
  const home = parts[0].trim();
  const away = parts[1].trim();
  if (!home || !away) return null;
  return [home, away];
}
