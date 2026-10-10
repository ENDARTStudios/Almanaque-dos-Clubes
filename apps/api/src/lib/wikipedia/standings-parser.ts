/**
 * T508 (W4) — parser da tabela de classificação da Wikipedia (HTML renderizado).
 *
 * A Wikipedia PT monta as tabelas via módulos Lua (`#invoke:sports results`),
 * então o WIKITEXT não as contém — é preciso o HTML de `action=parse&prop=text`.
 * PURO: entra HTML, sai a classificação. Sem rede/Prisma.
 *
 * Âncoras por CABEÇALHO (não por índice de tabela/servidor): procura a tabela
 * cujo cabeçalho tem Pos + Equipe/Time/Clube + J + Pts (tolerante a variações
 * de idioma e de ordem). Linhas incompletas são descartadas.
 */

export interface StandingRow {
  position: number;
  clubName: string;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
}

const stripTags = (s: string): string =>
  s
    .replace(/<sup[\s\S]*?<\/sup>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Divide o HTML em tabelas de nível superior (split simples por <table). */
export function splitTables(html: string): string[] {
  return html
    .split(/<table\b/i)
    .slice(1)
    .map((t) => '<table' + t.split(/<\/table>/i)[0] + '</table>');
}

function headerCells(table: string): string[] {
  const headEnd = table.search(/<\/tr>/i);
  if (headEnd < 0) return [];
  const head = table.slice(0, headEnd);
  return [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((m) =>
    stripTags(m[1]).toLowerCase(),
  );
}

/** Índice da coluna cujo cabeçalho casa o padrão (primeiro match). */
function findCol(headers: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const i = headers.findIndex((h) => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

/** `true` se o cabeçalho é de uma tabela de classificação. */
export function isStandingsHeader(headers: string[]): boolean {
  const hasPos = headers.some((h) => /^(pos|#|posiç|class)/i.test(h));
  const hasTeam = headers.some((h) => /equipe|time|clube|team/i.test(h));
  const hasPoints = headers.some((h) => /^(pts|pontos|points|p)$/i.test(h));
  const hasPlayed = headers.some((h) => /^(j|pj|jogos|played|p)$/i.test(h));
  return hasPos && hasTeam && hasPoints && hasPlayed;
}

const num = (s: string | undefined): number | null => {
  if (s == null) return null;
  const m = /(-?\d+)/.exec(s.replace(/\s/g, ''));
  return m ? Number.parseInt(m[1], 10) : null;
};

/** Extrai a classificação da PRIMEIRA tabela cujo cabeçalho casa; [] se nenhuma. */
export function parseStandings(html: string): StandingRow[] {
  for (const table of splitTables(html)) {
    const headers = headerCells(table);
    if (headers.length === 0 || !isStandingsHeader(headers)) continue;

    const iPos = findCol(headers, [/^(pos|#|posiç|class)/i]);
    const iTeam = findCol(headers, [/equipe|time|clube|team/i]);
    const iPlayed = findCol(headers, [/^(j|pj|jogos|played)/i]);
    const iWon = findCol(headers, [/^(v|vit|won|w)$/i]);
    const iDrawn = findCol(headers, [/^(e|emp|drawn|d)$/i]);
    const iLost = findCol(headers, [/^(d|der|loss|l)$/i]);
    const iGf = findCol(headers, [/^(gp|gf|gols? pró|goals for)/i]);
    const iGa = findCol(headers, [/^(gc|ga|gols? contra|goals against)/i]);
    const iPts = findCol(headers, [/^(pts|pontos|points)/i]);

    const rows: StandingRow[] = [];
    // linhas de dados: <tr>...</tr> após o cabeçalho
    const bodyMatch = table.slice(table.search(/<\/tr>/i) + 5);
    for (const tr of bodyMatch.split(/<tr\b/i).slice(1)) {
      const cells = [
        ...(tr.split(/<\/tr>/i)[0] ?? '').matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      ].map((m) => stripTags(m[1]));
      if (cells.length < 3) continue;
      const position = num(cells[iPos >= 0 ? iPos : 0]);
      const clubName = (cells[iTeam >= 0 ? iTeam : 1] ?? '').trim();
      // nome de clube plausível: tem letra e não é cabeçalho/nota
      if (position == null || !/[A-Za-zÀ-ÿ]{3}/.test(clubName)) continue;
      rows.push({
        position,
        clubName,
        played: iPlayed >= 0 ? num(cells[iPlayed]) : null,
        won: iWon >= 0 ? num(cells[iWon]) : null,
        drawn: iDrawn >= 0 ? num(cells[iDrawn]) : null,
        lost: iLost >= 0 ? num(cells[iLost]) : null,
        goalsFor: iGf >= 0 ? num(cells[iGf]) : null,
        goalsAgainst: iGa >= 0 ? num(cells[iGa]) : null,
        points: iPts >= 0 ? num(cells[iPts]) : null,
      });
    }
    if (rows.length >= 4) return rows.sort((a, b) => a.position - b.position);
  }
  return [];
}

/** Artilheiro: primeira linha com nome + número na seção de artilharia (heurística). */
export interface TopScorer {
  name: string;
  goals: number;
}

export function parseTopScorer(html: string): TopScorer | null {
  // procura "Artilharia" e, nas tabelas seguintes, a linha com maior contagem
  const idx = html.search(/Artilharia|Artilheiro|Top scorers?/i);
  if (idx < 0) return null;
  const after = html.slice(idx);
  let best: TopScorer | null = null;
  for (const table of splitTables(after)) {
    for (const tr of table.split(/<tr\b/i).slice(1)) {
      const cells = [
        ...(tr.split(/<\/tr>/i)[0] ?? '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),
      ].map((m) => stripTags(m[1]));
      if (cells.length < 2) continue;
      const name = cells.find((c) => /[A-Za-zÀ-ÿ]{4}/.test(c) && !/^\d+$/.test(c));
      const goals = num(cells[cells.length - 1]);
      if (name && goals != null && goals > 0 && (!best || goals > best.goals)) {
        best = { name, goals };
      }
    }
    if (best) break;
  }
  return best;
}
