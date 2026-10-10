/**
 * T508 (W4) — parser da tabela de classificação da Wikipedia (HTML renderizado).
 * T510 (W4.1) — generalização multi-idioma (pt/en/es/it) + suporte a COPA.
 *
 * A Wikipedia monta as tabelas via módulos Lua (`#invoke:sports results`), então
 * o WIKITEXT não as contém — é preciso o HTML de `action=parse&prop=text`.
 * PURO: entra HTML, sai a classificação. Sem rede/Prisma.
 *
 * Âncoras por CABEÇALHO (não por índice de tabela): o idioma é detectado pelos
 * rótulos distintivos (Equipe→pt, Team→en, Equipo→es, Squadra→it) e cada coluna
 * é resolvida por um léxico POR IDIOMA — necessário porque "G" é *jogos* (it) e
 * *vitórias* (es), e "D"/"P" mudam de sentido entre pt/en/es/it.
 *
 * A célula do clube traz um link para o ARTIGO do clube (`/wiki/<Título>`); o
 * `title` desse link (ex.: "Manchester City F.C.") é exposto em `clubArticle`
 * para o seed resolver o QID via Wikipedia (matching 100% confiável). Links de
 * arquivo (`/wiki/File:...`) são ignorados.
 */

export interface StandingRow {
  position: number;
  clubName: string;
  /** Título do artigo da Wikipedia do clube (para casar por QID). */
  clubArticle?: string | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
  /** Coluna "Grp" (fase de grupos combinada de uma copa). */
  group?: string | null;
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

export type StandingsLang = 'pt' | 'en' | 'es' | 'it' | 'unknown';

/** Detecta o idioma da tabela pelos rótulos distintivos do cabeçalho. */
export function detectLang(headers: string[]): StandingsLang {
  const j = ' ' + headers.join(' ') + ' ';
  if (/\bsquadra\b/.test(j)) return 'it';
  if (/\bequipo\b/.test(j)) return 'es';
  if (/\bequipe\b/.test(j)) return 'pt';
  if (/\bteam\b/.test(j)) return 'en';
  return 'unknown';
}

interface Lexicon {
  pos: RegExp[];
  team: RegExp[];
  played: RegExp[];
  won: RegExp[];
  drawn: RegExp[];
  lost: RegExp[];
  gf: RegExp[];
  ga: RegExp[];
  pts: RegExp[];
  group: RegExp[];
}

/**
 * Léxico de colunas por idioma. Cada idioma mapeia SEUS rótulos — evita a
 * ambiguidade fatal de um léxico único ("D" = *derrotas* em pt, *drawn* em en;
 * "G" = *jogos* em it, *ganados* em es; "P" = *perdidos* em it/es).
 */
const LEXICON: Record<StandingsLang, Lexicon> = {
  pt: {
    pos: [/^(pos|#|posiç|class|seed)/i],
    team: [/equipe|time|clube/i],
    played: [/^(j|pj|jogos)$/i],
    won: [/^(v|vit)/i],
    drawn: [/^(e|emp)/i],
    lost: [/^(d|der)/i],
    gf: [/^(gp|gf|gols? pró)/i],
    ga: [/^(gc|ga|gols? contra)/i],
    pts: [/^(pts|pontos)/i],
    group: [/^(grp|grupo|group)$/i],
  },
  en: {
    pos: [/^(pos|#)/i],
    team: [/^team\b/i],
    played: [/^(pld|played|mp)$/i],
    won: [/^(w|won)$/i],
    drawn: [/^(d|drawn)$/i],
    lost: [/^(l|loss|lost)$/i],
    gf: [/^(gf|goals? for)/i],
    ga: [/^(ga|goals? against)/i],
    pts: [/^(pts|points)/i],
    group: [/^(grp|group)$/i],
  },
  es: {
    pos: [/^(pos|#)/i],
    team: [/^equipo\b/i],
    played: [/^(pj)$/i],
    won: [/^(g|pg)$/i],
    drawn: [/^(e|pe)$/i],
    lost: [/^(p|pp)$/i],
    gf: [/^(gf)$/i],
    ga: [/^(gc)$/i],
    pts: [/^(pts)/i],
    group: [/^(grp|grupo|group)$/i],
  },
  it: {
    pos: [/^(pos|#)/i],
    team: [/^squadra\b/i],
    played: [/^(g)$/i],
    won: [/^(v)$/i],
    drawn: [/^(n)$/i],
    lost: [/^(p)$/i],
    gf: [/^(gf)$/i],
    ga: [/^(gs)$/i],
    pts: [/^(pt)/i],
    group: [/^(grp|gruppo|group)$/i],
  },
  unknown: {
    pos: [/^(pos|#|posiç|class|seed)/i],
    team: [/equipe|time|clube|team|equipo|squadra/i],
    played: [/^(j|pj|jogos|played|pld|mp|g)$/i],
    won: [/^(v|vit|won|w|g)$/i],
    drawn: [/^(e|emp|drawn|n)$/i],
    lost: [/^(d|der|loss|l|p)$/i],
    gf: [/^(gp|gf|goals? for)/i],
    ga: [/^(gc|ga|goals? against)/i],
    pts: [/^(pts|pontos|points|pt)/i],
    group: [/^(grp|grupo|group|gruppo)$/i],
  },
};

/** Colunas resolvidas para um cabeçalho. */
export interface StandingCols {
  lang: StandingsLang;
  pos: number;
  team: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
  group: number;
}

function resolveCols(headers: string[]): StandingCols {
  const lang = detectLang(headers);
  const L = LEXICON[lang];
  return {
    lang,
    pos: findCol(headers, L.pos),
    team: findCol(headers, L.team),
    played: findCol(headers, L.played),
    won: findCol(headers, L.won),
    drawn: findCol(headers, L.drawn),
    lost: findCol(headers, L.lost),
    gf: findCol(headers, L.gf),
    ga: findCol(headers, L.ga),
    pts: findCol(headers, L.pts),
    group: findCol(headers, L.group),
  };
}

/** `true` se o cabeçalho é de uma tabela de classificação. */
export function isStandingsHeader(headers: string[]): boolean {
  const c = resolveCols(headers);
  return c.pos >= 0 && c.team >= 0 && c.pts >= 0 && c.played >= 0;
}

const num = (s: string | undefined): number | null => {
  if (s == null) return null;
  const m = /(-?\d+)/.exec(s.replace(/\s/g, ''));
  return m ? Number.parseInt(m[1], 10) : null;
};

const FILE_PREFIX = /^(File|Ficheiro|Archivo|Imagem|Imagen|Datei|Fichier|Immagine):/i;

/**
 * Extrai o nome do clube de uma célula (HTML cru).
 *
 * A célula costuma conter OUTROS links antes do clube — a bandeira do estado/país
 * (`<a href="/wiki/Rio_de_Janeiro_(estado)"><img .../></a>`) e, na it.wikipedia,
 * o uniforme (`File:...`). Regra: entre os links que NÃO são arquivo, escolhe o
 * de MAIOR texto de exibição (bandeira/escudo não têm texto) — assim pega o clube.
 * `clubArticle` = título do artigo (para casar por QID); `clubName` = texto exibido.
 */
export function clubFromCell(cellHtml: string): { name: string; article: string | null } {
  const links: Array<{ article: string; display: string }> = [];
  for (const m of cellHtml.matchAll(/<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const target = decodeURIComponent(m[1]).replace(/_/g, ' ');
    if (FILE_PREFIX.test(target)) continue;
    const t = /\btitle="([^"]*)"/i.exec(m[0]);
    const article = (t ? t[1] : target).trim();
    links.push({ article, display: stripTags(m[2]).trim() });
  }
  const withText = links.filter((l) => l.display.length >= 3);
  if (withText.length > 0) {
    withText.sort((a, b) => b.display.length - a.display.length);
    return { name: withText[0].display, article: withText[0].article };
  }
  if (links.length > 0) {
    const last = links[links.length - 1];
    return { name: last.article, article: last.article };
  }
  const name = stripTags(cellHtml)
    .replace(/\(.*?\)/g, '')
    .trim();
  return { name, article: null };
}

export interface ParseStandingsOptions {
  /** Exige uma coluna "Grp" (tabela combinada da fase de grupos de uma copa). */
  requireGroup?: boolean;
  /** Mínimo de linhas para aceitar a tabela (default 4). */
  minRows?: number;
}

/**
 * Extrai a classificação da PRIMEIRA tabela cujo cabeçalho casa; [] se nenhuma.
 * Com `requireGroup`, só aceita tabelas com coluna de grupo (`Grp`).
 */
export function parseStandings(html: string, opts: ParseStandingsOptions = {}): StandingRow[] {
  const minRows = opts.minRows ?? 4;
  for (const table of splitTables(html)) {
    const headers = headerCells(table);
    if (headers.length === 0 || !isStandingsHeader(headers)) continue;
    const c = resolveCols(headers);
    if (opts.requireGroup && c.group < 0) continue;

    const rows: StandingRow[] = [];
    const bodyMatch = table.slice(table.search(/<\/tr>/i) + 5);
    for (const tr of bodyMatch.split(/<tr\b/i).slice(1)) {
      const raw = tr.split(/<\/tr>/i)[0] ?? '';
      const cellHtml = [...raw.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
      if (cellHtml.length < 3) continue;
      const plain = cellHtml.map(stripTags);
      const position = num(plain[c.pos >= 0 ? c.pos : 0]);
      const rawCell = cellHtml[c.team >= 0 ? c.team : 1] ?? '';
      const { name: clubName, article } = clubFromCell(rawCell);
      // nome de clube plausível: tem letra e não é cabeçalho/nota
      if (position == null || !/[A-Za-zÀ-ÿ]{3}/.test(clubName)) continue;
      rows.push({
        position,
        clubName,
        clubArticle: article,
        played: c.played >= 0 ? num(plain[c.played]) : null,
        won: c.won >= 0 ? num(plain[c.won]) : null,
        drawn: c.drawn >= 0 ? num(plain[c.drawn]) : null,
        lost: c.lost >= 0 ? num(plain[c.lost]) : null,
        goalsFor: c.gf >= 0 ? num(plain[c.gf]) : null,
        goalsAgainst: c.ga >= 0 ? num(plain[c.ga]) : null,
        points: c.pts >= 0 ? num(plain[c.pts]) : null,
        group: c.group >= 0 ? plain[c.group]?.trim() || null : null,
      });
    }
    if (rows.length >= minRows) return rows.sort((a, b) => a.position - b.position);
  }
  return [];
}

/** Artilheiro: primeira linha com nome + número na seção de artilharia (heurística). */
export interface TopScorer {
  name: string;
  goals: number;
}

// Âncoras por idioma: pt "Artilharia", en "Top scorers", es "Máximos goleadores",
// it "Classifica marcatori".
const SCORER_ANCHOR =
  /Artilharia|Artilheiro|Top scorers?|Máximos goleadores|Máximos? artilheiros?|Goleadores|Classifica marcatori|Marcatori|Capocannonieri|Meilleurs buteurs/i;

export function parseTopScorer(html: string): TopScorer | null {
  const idx = html.search(SCORER_ANCHOR);
  if (idx < 0) return null;
  const after = html.slice(idx);

  // 1) Tabela cujo CABEÇALHO tem coluna de gols — a posição varia por idioma
  //    (en/pt: última; es: 4ª de 6, seguida de "Part./Prom."; it: PRIMEIRA,
  //    seguida de "Rigori"). Ancorar por cabeçalho evita pegar "Prom." como gols.
  for (const table of splitTables(after)) {
    const headEnd = table.search(/<\/tr>/i);
    if (headEnd < 0) continue;
    const headers = [...table.slice(0, headEnd).matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(
      (m) => stripTags(m[1]).toLowerCase(),
    );
    const iGoals = findCol(headers, [/^(gol|goles|goals|reti|buts|gols|tore)/i]);
    if (iGoals < 0) continue;
    const iPlayer = findCol(headers, [/^(jugador|giocatore|player|jogador|buteur|nome|name)/i]);
    let best: TopScorer | null = null;
    const body = table.slice(headEnd + 5);
    for (const tr of body.split(/<tr\b/i).slice(1)) {
      const cells = [
        ...(tr.split(/<\/tr>/i)[0] ?? '').matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      ].map((m) => stripTags(m[1]));
      if (cells.length <= iGoals) continue;
      const goals = num(cells[iGoals]);
      const name =
        iPlayer >= 0 && cells[iPlayer]
          ? cells[iPlayer]
          : cells.find((c, k) => k !== iGoals && /[A-Za-zÀ-ÿ]{4}/.test(c) && !/^\d/.test(c));
      // Guard: gols plausíveis (recordes ~35-40; 'Flamengo (33778)' é outra coluna).
      if (name && goals != null && goals > 0 && goals <= 60 && (!best || goals > best.goals)) {
        best = { name: name.trim(), goals };
      }
    }
    if (best) return best;
  }

  // 2) Fallback heurístico (tabela sem cabeçalho reconhecível).
  let best: TopScorer | null = null;
  for (const table of splitTables(after)) {
    for (const tr of table.split(/<tr\b/i).slice(1)) {
      const cells = [
        ...(tr.split(/<\/tr>/i)[0] ?? '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),
      ].map((m) => stripTags(m[1]));
      if (cells.length < 2) continue;
      const name = cells.find((c) => /[A-Za-zÀ-ÿ]{4}/.test(c) && !/^\d+$/.test(c));
      const goals = num(cells[cells.length - 1]);
      if (name && goals != null && goals > 0 && goals <= 60 && (!best || goals > best.goals)) {
        best = { name: name.trim(), goals };
      }
    }
    if (best) break;
  }
  return best;
}

/** Colocações finais de uma COPA (infobox): campeão e vice-campeão. */
export interface CupPlacements {
  champion: string | null;
  championArticle: string | null;
  runnerUp: string | null;
  runnerUpArticle: string | null;
}

const CHAMPION_LABELS = ['Campeão', 'Campeon', 'Champion', 'Campeón', 'Campione', 'Vencedor'];
const RUNNERUP_LABELS = [
  'Vice-campeão',
  'Vice-campeao',
  'Vice',
  'Runner-up',
  'Subcampeón',
  'Subcampeon',
  'Second place',
  'Finalista perdente',
  '2.º lugar',
];

function infoboxTeam(
  html: string,
  labels: string[],
): { name: string; article: string | null } | null {
  for (const label of labels) {
    // <th ...>Campeão</th><td ...> <a href=... title=...>Nome</a> ... </td>
    const re = new RegExp(
      `<th[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`,
      'i',
    );
    const m = re.exec(html);
    if (!m) continue;
    const cell = m[1];
    const link = /<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>/i.exec(cell);
    if (link) {
      const target = decodeURIComponent(link[1]).replace(/_/g, ' ');
      if (!FILE_PREFIX.test(target)) {
        const t = /\btitle="([^"]*)"/i.exec(link[0]);
        const article = (t ? t[1] : target).trim();
        return { name: article, article };
      }
    }
    const name = stripTags(cell)
      .replace(/\(.*?\)/g, '')
      .trim();
    if (name) return { name, article: null };
  }
  return null;
}

/** Extrai campeão/vice da copa a partir do infobox ("Colocações finais"). */
export function parseCupPlacements(html: string): CupPlacements {
  const champ = infoboxTeam(html, CHAMPION_LABELS);
  const runner = infoboxTeam(html, RUNNERUP_LABELS);
  return {
    champion: champ?.name ?? null,
    championArticle: champ?.article ?? null,
    runnerUp: runner?.name ?? null,
    runnerUpArticle: runner?.article ?? null,
  };
}
