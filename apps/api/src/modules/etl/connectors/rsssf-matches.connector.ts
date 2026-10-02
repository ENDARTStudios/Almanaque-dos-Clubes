/**
 * T420 — Conector RSSSF (resultados de partidas, texto público) → MatchCandidate.
 *
 * RSSSF (Rec.Sport.Soccer Statistics Foundation) publica tabelas de resultados em
 * texto puro com layouts que variam por competição/temporada. Este conector não
 * tenta cobrir todos os layouts — ele normaliza um conjunto documentado de formatos
 * (ver docs/DATA-INGESTION.md §resultados) e entrega todo o resto em `skipped`
 * para revisão. Qualquer linha não reconhecida NUNCA é descartada silenciosamente.
 *
 * Contrato de linha aceito (canônico):
 *   <data> <casa> - <fora> <gols-casa>-<gols-fora>   [ (Rodada N) | (Round N) ]
 *   <data> <casa> vs <fora> <gols-casa>:<gols-fora>
 * onde <data> ∈ {YYYY-MM-DD | DD/MM/YYYY | DD.MM.YY | [DD.MM.YY]}.
 *
 * Saída: `MatchCandidate[]` (validada por Zod) + `skipped[]` (linhas não casadas,
 * com motivo), para garantir proveniência e rastreabilidade.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// SCHEDAS ZOD
// ---------------------------------------------------------------------------

export const MatchCandidateSchema = z.object({
  homeName: z.string().min(1, 'homeName vazio'),
  awayName: z.string().min(1, 'awayName vazio'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser ISO YYYY-MM-DD'),
  homeScore: z.number().int().nonnegative('placar negativo'),
  awayScore: z.number().int().nonnegative('placar negativo'),
  round: z.string().nullable(),
  competitionName: z.string().min(1),
  season: z.string().min(1),
});
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;

export const SourceProvenanceSchema = z.object({
  dataSource: z.enum(['rsssf', 'wikidata', 'manual']),
  sourceUrl: z.string().url(),
  license: z.string().min(1),
});
export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;

interface RsssfParseOptions {
  competitionName: string;
  season: string;
  sourceUrl: string;
}

export interface RsssfParseResult {
  matches: MatchCandidate[];
  skipped: { line: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// PARSING
// ---------------------------------------------------------------------------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Normaliza um mês abreviado (jan, janeiro) → número 1-12. */
function monthNumber(s: string): number | null {
  const low = s.toLowerCase().replace(/\./g, '').trim();
  const idx = MONTHS.findIndex((m) => low.startsWith(m));
  return idx >= 0 ? idx + 1 : null;
}

/** Converte uma data em um dos formatos aceitos para ISO YYYY-MM-DD. Retorna null se não reconhecida. */
function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(s)) {
    const [d, m, y] = s.split('.');
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const mm = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?(,)?\s+(\d{2,4})$/);
  if (mm) {
    const mon = monthNumber(mm[2]);
    if (!mon) return null;
    const yy = mm[3].length === 2 ? `20${mm[3]}` : mm[3];
    return `${yy}-${String(mon).padStart(2, '0')}-${mm[1].padStart(2, '0')}`;
  }
  return null;
}

/** Remove acentos e normaliza para comparação fuzzy de nomes de clube. */
export function normalizeClubName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove prefixo de data (se houver) e devolve o restante da linha. */
function stripLeadingDate(line: string): { date: string | null; rest: string } {
  const m =
    line.match(/^\[?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})\s*\]?\s*[-–]?\s*/i) ??
    line.match(/^(\d{4}-\d{1,2}-\d{1,2})\s*[-–]?\s*/i) ??
    line.match(/^(\d{1,2}\s+[A-Za-z]{3,}\.?\s*,?\s+\d{2,4})\s*[-–]?\s*/i);
  if (!m) return { date: null, rest: line };
  return { date: m[1], rest: line.slice(m[0].length) };
}

/** Interpreta uma linha no formato canônico e retorna um candidato ou { skip }. */
function parseLine(line: string, opts: RsssfParseOptions): MatchCandidate | { skip: string } {
  const trimmed = line.trim();
  if (!trimmed || /^(#|\/\/)/.test(trimmed)) return { skip: 'linha vazia/comentário' };

  const { date, rest } = stripLeadingDate(trimmed);
  const iso = date ? toIsoDate(date) : null;
  if (!date || !iso) return { skip: 'sem data reconhecida' };

  const scoreMatch = rest.match(
    /\s(\d{1,2})\s*[-:]\s*(\d{1,2})\s*(?:\(?\s*(?:Round|Rodada|R)?\s*([^)]*?)\)?)?\s*$/i,
  );
  if (!scoreMatch) return { skip: 'sem placar numérico no fim' };
  const hs = parseInt(scoreMatch[1], 10);
  const as = parseInt(scoreMatch[2], 10);
  if (Number.isNaN(hs) || Number.isNaN(as)) return { skip: 'placar inválido' };

  if (scoreMatch.index === undefined) return { skip: 'índice do placar indefinido' };
  const body = rest.slice(0, scoreMatch.index).trim();
  let homeName = '';
  let awayName = '';
  const vs = body.match(/\s+(?:vs|v)\s+/i);
  if (vs && vs.index !== undefined) {
    homeName = body.slice(0, vs.index).trim();
    awayName = body.slice(vs.index + vs[0].length).trim();
  } else {
    const parts = body.split(/\s+[-–—]\s+/);
    if (parts.length === 2) {
      homeName = parts[0].trim();
      awayName = parts[1].trim();
    }
  }
  if (!homeName || !awayName) return { skip: 'não foi possível separar casa/fora' };

  const parsed = MatchCandidateSchema.safeParse({
    homeName,
    awayName,
    date: iso,
    homeScore: hs,
    awayScore: as,
    round: scoreMatch[3]?.trim() || null,
    competitionName: opts.competitionName,
    season: opts.season,
  });
  if (!parsed.success) return { skip: `falha na validação Zod: ${parsed.error.message}` };
  return parsed.data;
}

/** Ponto de entrada: texto RSSSF → candidatos normalizados + linhas puladas. Idempotente (sem estado). */
export function parseRsssfMatches(text: string, opts: RsssfParseOptions): RsssfParseResult {
  const matches: MatchCandidate[] = [];
  const skipped: { line: string; reason: string }[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const r = parseLine(line, opts);
    if ('skip' in r) skipped.push({ line, reason: r.skip });
    else matches.push(r);
  }
  return { matches, skipped };
}

/** HTTP identificado para baixar texto RSSSF. */
export async function fetchRsssfText(url: string, userAgent: string): Promise<string> {
  const res = await globalThis.fetch(url, {
    headers: { 'user-agent': userAgent, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.8' },
  });
  if (!res.ok) throw new Error(`RSSSF HTTP ${res.status} em ${url}`);
  return res.text();
}
