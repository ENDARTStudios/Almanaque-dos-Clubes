/**
 * T449a — Parser RSSSF de TABELAS FINAIS (classificação por divisão).
 *
 * Fonte: RSSSF (ex.: eng2023.html). Licença: "(C) Copyright … free to copy …
 * provided that proper acknowledgement is given" → ATRIBUIÇÃO obrigatória
 * (não é domínio público — R3-5). Cada registro precisa de sourceUrl +
 * retrievedAt + crédito.
 *
 * Funções PURAS (sem I/O): o fetch/Prisma fica no script. Zod valida cada linha.
 */
import { z } from 'zod';
import { normalizeMinMax } from '../../rankings/ranking-algorithm.service.js';

export const RSSSF_ATTRIBUTION =
  'RSSSF — The Rec.Sport.Soccer Statistics Foundation (rec.sport.soccer)';
export const RSSSF_LICENSE = 'RSSSF: uso condicionado a atribuição adequada';

export const TableRowSchema = z.object({
  position: z.number().int().positive(),
  club: z.string().min(1),
  played: z.number().int().nonnegative(),
  won: z.number().int().nonnegative(),
  drawn: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
});
export type TableRow = z.infer<typeof TableRowSchema>;

export interface DivisionTable {
  division: string;
  rows: TableRow[];
}

// Divisões inglesas presentes na página de temporada (ordem de exibição).
const DIVISIONS = [
  'Premier League',
  'Championship',
  'Division 1',
  'Division 2',
  'National League',
] as const;

// Linha de tabela: " 1.Manchester City  38 28 5 5 94-33 89   [C]  Champions"
const ROW_RE = /^\s*(\d+)\.(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)-(\d+)\s+(\d+)\b/;

/** Parseia UMA tabela final (linhas consecutivas) de um bloco de texto. */
export function parseTableRows(block: string): TableRow[] {
  const rows: TableRow[] = [];
  for (const line of block.split('\n')) {
    const m = ROW_RE.exec(line);
    if (!m) continue;
    const parsed = TableRowSchema.safeParse({
      position: Number(m[1]),
      club: m[2].trim(),
      played: Number(m[3]),
      won: Number(m[4]),
      drawn: Number(m[5]),
      lost: Number(m[6]),
      goalsFor: Number(m[7]),
      goalsAgainst: Number(m[8]),
      points: Number(m[9]),
    });
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

/**
 * Extrai as tabelas finais por divisão de uma página de temporada do RSSSF.
 * Determinístico: usa os cabeçalhos de divisão conhecidos; 1 tabela por divisão.
 */
export function parseEnglandFinalTables(page: string): DivisionTable[] {
  const text = page.replace(/\r/g, '');
  const out: DivisionTable[] = [];
  const seen = new Set<string>();
  let from = 0;
  for (;;) {
    const ft = text.indexOf('Final Table:', from);
    if (ft < 0) break;
    // Divisão = ÚLTIMO header conhecido ANTES deste "Final Table:" (ignora o TOC).
    const prefix = text.slice(0, ft);
    let division = '';
    let best = -1;
    for (const d of DIVISIONS) {
      const idx = prefix.lastIndexOf(d);
      if (idx > best) {
        best = idx;
        division = d;
      }
    }
    // Rows: deste "Final Table:" até o próximo (match results não casam o regex de posição).
    const rest = text.slice(ft + 'Final Table:'.length);
    const nextFt = rest.indexOf('Final Table:');
    const block = rest.slice(0, nextFt >= 0 ? nextFt : rest.length);
    const rows = parseTableRows(block);
    if (division && !seen.has(division) && rows.length) {
      seen.add(division);
      out.push({ division, rows });
    }
    from = ft + 1;
  }
  return out;
}

/**
 * Ranking 0-100 por divisão a partir da pontuação de classificação (MinMax).
 * Sem partidas individuais (T449a). Reprodutível e determinístico.
 */
export function rankDivision(rows: TableRow[], max = 100): Array<TableRow & { score: number }> {
  if (!rows.length) return [];
  const ordered = [...rows].sort(
    (a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst),
  );
  const scores = normalizeMinMax(
    ordered.map((r) => r.points),
    max,
  );
  return ordered.map((r, i) => ({ ...r, score: scores[i] }));
}

/** URL canônica da página de temporada (RSSSF) — proveniência por registro. */
export function rsssfSeasonUrl(season: string): string {
  return `https://www.rsssf.org/tablese/eng${season}.html`;
}
