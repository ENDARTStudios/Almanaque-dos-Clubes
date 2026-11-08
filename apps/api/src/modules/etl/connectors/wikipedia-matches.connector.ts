/**
 * Parser de PARTIDAS de fase de grupos da Wikipedia (HTML renderizado, CC BY-SA 4.0).
 * Caso de uso inicial: Copa Libertadores 2021 — 8 grupos × 12 jogos = 96 partidas.
 *
 * Fontes:
 *  - EN `2021_Copa_Libertadores_group_stage` (oldid 1363263442): caixas
 *    `<div class="footballbox">` com `fdate` (data ISO escondida em
 *    `span.bday.dtstart`), `fhome`/`fscore`/`faway` + microdata
 *    `itemprop="homeTeam"/"awayTeam"`. PRIMÁRIO: a data já vem normalizada em
 *    ISO e cada caixa é um jogo inequívoco.
 *  - PT `Fase_de_grupos_da_Copa_Libertadores_da_América_de_2021`: tabelas SEM
 *    class `wikitable` (só style), uma por jogo, linha 1 = data | casa | placar
 *    | fora | estádio, cidade. CROSS-CHECK de placar + FONTE do `venue` (o box
 *    EN não traz estádio).
 *
 * Armadilha tratada (mesma da skill wiki-table-parser): o 1º link da célula do
 * time pode ser a BANDEIRA do país (EN away: "Argentine Football Association";
 * PT: "/wiki/Argentina") — link SEM TEXTO visível (só `<img>`). A regra aqui é
 * pegar o primeiro `<a>` COM texto visível não-vazio.
 *
 * PURO: entra HTML, saem partidas. Sem rede/Prisma. Sem placar de
 * pênaltis/prorrogação (não existe em fase de grupos).
 */
export interface WikiMatchParsed {
  /** "Group A" .. "Group H" (rótulo da seção da fonte, EN ou PT). */
  group: string;
  /** "2021-04-21" (data impressa na fonte, normalizada ISO em UTC); null = sem data. */
  dateIso: string | null;
  homeTeam: string;
  /** Título do artigo da Wikipedia do clube (para mapa nome→QID do script). */
  homeArticle: string | null;
  awayTeam: string;
  awayArticle: string | null;
  homeScore: number | null;
  awayScore: number | null;
  /** "Estádio Casa Blanca, Quito" — só existe na fonte PT. */
  venue: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const decodeHtmlEntities = (s: string): string =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number.parseInt(d, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

const stripTags = (s: string): string =>
  decodeHtmlEntities(s.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;])/g, '$1') // "</a>, <a>" virava "Casa Blanca , Quito"
    .trim();

/** Placar "1–1", "0 - 2", "3–1" (traços: – — − -). */
const SCORE_RE = /(\d{1,2})\s*[–—−-]\s*(\d{1,2})/;

export function parseScoreCell(raw: string): { home: number; away: number } | null {
  const m = SCORE_RE.exec(decodeHtmlEntities(raw));
  if (!m) return null;
  return { home: Number(m[1]), away: Number(m[2]) };
}

export interface TeamLink {
  name: string;
  article: string | null;
}

/**
 * Primeiro `<a>` da célula COM texto visível (a bandeira é um link só com
 * `<img>` — texto vazio — e cai fora). `article` = título do artigo (decodificado).
 */
export function teamFromCell(cellHtml: string): TeamLink | null {
  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(cellHtml)) !== null) {
    const attrs = m[1] ?? '';
    const text = stripTags(m[2] ?? '');
    if (!text) continue; // âncora de imagem (bandeira/escudo)
    const title = /title="([^"]*)"/.exec(attrs);
    const href = /href="([^"]*)"/.exec(attrs);
    let article: string | null = null;
    if (title?.[1]) article = decodeHtmlEntities(title[1]).trim();
    else if (href?.[1]) {
      const wiki = decodeHtmlEntities(href[1]);
      if (wiki.startsWith('/wiki/')) {
        article = wiki.slice('/wiki/'.length).split('#')[0]!.replace(/_/g, ' ').trim();
      }
    }
    return { name: text, article };
  }
  // Sem link com texto: usa a célula inteira limpa (times em texto puro).
  const plain = stripTags(cellHtml);
  return plain ? { name: plain, article: null } : null;
}

// ---------------------------------------------------------------------------
// Seções de grupo (EN "Group A" / PT "Grupo A" — por HEADING, não por índice)
// ---------------------------------------------------------------------------
interface GroupSection {
  group: string;
  html: string;
}

function splitGroupSections(html: string): GroupSection[] {
  const out: GroupSection[] = [];
  const headingRe = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  const marks: Array<{ pos: number; group: string | null }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    const inner = m[2] ?? '';
    const byId = /id="(?:Group|Grupo)_([A-H])\b"/i.exec(inner);
    const byText = /^(?:Group|Grupo)\s+([A-H])\b/i.test(stripTags(inner));
    const letter = byId?.[1] ?? (byText ? stripTags(inner).match(/([A-H])\b/i)?.[1] : undefined);
    marks.push({
      pos: m.index,
      group: letter ? `Group ${letter.toUpperCase()}` : null,
    });
  }
  for (let i = 0; i < marks.length; i++) {
    if (!marks[i]!.group) continue;
    const start = marks[i]!.pos;
    const end = i + 1 < marks.length ? marks[i + 1]!.pos : html.length;
    out.push({ group: marks[i]!.group!, html: html.slice(start, end) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// EN — footballbox (fdate/fhome/fscore/faway + microdata)
// ---------------------------------------------------------------------------
const EN_MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/** Data ISO do box: 1º a fonte estruturada (`itvstart">2021-04-21<`); fallback no texto. */
export function parseEnBoxDate(boxHtml: string): string | null {
  const hidden = /itvstart">(\d{4}-\d{2}-\d{2})</.exec(boxHtml);
  if (hidden) return hidden[1]!;
  const fdate = /<div[^>]*class="fdate"[^>]*>[\s\S]*?<\/div>/.exec(boxHtml);
  if (!fdate) return null;
  const text = stripTags(fdate[0]);
  const m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(text);
  if (!m) return null;
  const month = EN_MONTHS[m[2]!.toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

function cellByClass(boxHtml: string, cls: string): string | null {
  const m = new RegExp(`class="${cls}"[\\s\\S]*?<\\/t[hd]>`).exec(boxHtml);
  return m ? m[0] : null;
}

export function parseWikipediaMatchesEn(html: string): {
  matches: WikiMatchParsed[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const matches: WikiMatchParsed[] = [];
  const sections = splitGroupSections(html);
  if (sections.length === 0) warnings.push('EN: nenhuma seção "Group X" encontrada');
  for (const section of sections) {
    const boxStarts: number[] = [];
    const boxRe = /<div\b[^>]*class="footballbox"[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = boxRe.exec(section.html)) !== null) boxStarts.push(m.index);
    if (boxStarts.length === 0) {
      warnings.push(`EN: ${section.group} sem footballbox`);
      continue;
    }
    for (let i = 0; i < boxStarts.length; i++) {
      const box = section.html.slice(
        boxStarts[i]!,
        i + 1 < boxStarts.length ? boxStarts[i + 1]! : section.html.length,
      );
      const home = cellByClass(box, 'fhome');
      const away = cellByClass(box, 'faway');
      const score = cellByClass(box, 'fscore');
      const homeTeam = home ? teamFromCell(home) : null;
      const awayTeam = away ? teamFromCell(away) : null;
      const parsed = score ? parseScoreCell(score) : null;
      if (!homeTeam || !awayTeam) {
        warnings.push(`EN: ${section.group} jogo ${i + 1} sem time legível`);
        continue;
      }
      if (!parsed) {
        warnings.push(
          `EN: ${section.group} jogo ${i + 1} sem placar (${homeTeam.name} × ${awayTeam.name})`,
        );
        continue;
      }
      matches.push({
        group: section.group,
        dateIso: parseEnBoxDate(box),
        homeTeam: homeTeam.name,
        homeArticle: homeTeam.article,
        awayTeam: awayTeam.name,
        awayArticle: awayTeam.article,
        homeScore: parsed.home,
        awayScore: parsed.away,
        venue: null,
      });
    }
  }
  return { matches, warnings };
}

// ---------------------------------------------------------------------------
// PT — tabelas de partida SEM class (só style), linha 1: data|casa|placar|fora|estádio
// ---------------------------------------------------------------------------
// Chaves SEM acento (o input é dobrado por foldMonth).
const PT_MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const FOLDS: Record<string, string> = {
  ç: 'c',
  á: 'a',
  â: 'a',
  ã: 'a',
  é: 'e',
  ê: 'e',
  í: 'i',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
};

function foldMonth(word: string): string {
  return word.toLowerCase().replace(/[çáâãéêíóôõú]/g, (c) => FOLDS[c] ?? c);
}

/** "21 de abril" → mês/dia (o ano vem da temporada, a fonte PT não imprime). */
export function parsePtDateCell(raw: string): { day: number; month: number } | null {
  const m = /(\d{1,2})\s+de\s+([a-zçáâãéêíóôõú]+)/i.exec(stripTags(raw));
  if (!m) return null;
  const month = PT_MONTHS[foldMonth(m[2]!)];
  if (!month) return null;
  return { day: Number(m[1]), month };
}

export function parseWikipediaMatchesPt(
  html: string,
  seasonYear: number,
): { matches: WikiMatchParsed[]; warnings: string[] } {
  const warnings: string[] = [];
  const matches: WikiMatchParsed[] = [];
  const sections = splitGroupSections(html);
  if (sections.length === 0) warnings.push('PT: nenhuma seção "Grupo X" encontrada');
  for (const section of sections) {
    const tableRe = /<table\b[\s\S]*?<\/table>/gi;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = tableRe.exec(section.html)) !== null) {
      const table = m[0];
      if (/class="[^"]*wikitable/i.test(table)) continue; // classificação, não partida
      const firstRow = /<tr\b[\s\S]*?<\/tr>/i.exec(table.slice(table.indexOf('>') + 1));
      if (!firstRow) continue;
      const tds = [...firstRow[0].matchAll(/<td\b[\s\S]*?<\/td>/gi)].map((t) => t[0]);
      if (tds.length < 5) continue;
      const date = parsePtDateCell(tds[0]!);
      const score = parseScoreCell(tds[2]!);
      const home = teamFromCell(tds[1]!);
      const away = teamFromCell(tds[3]!);
      if (!date || !score || !home || !away) continue;
      count++;
      matches.push({
        group: section.group,
        // A fonte PT não imprime o ano: a temporada (CLI) fecha a data ISO.
        dateIso: `${seasonYear}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
        homeTeam: home.name,
        homeArticle: home.article,
        awayTeam: away.name,
        awayArticle: away.article,
        homeScore: score.home,
        awayScore: score.away,
        venue: stripTags(tds[4]!) || null,
      });
    }
    if (count === 0) warnings.push(`PT: ${section.group} sem tabela de partida reconhecida`);
  }
  return { matches, warnings };
}

// ---------------------------------------------------------------------------
// Identidade de clube — mapa FIXO nome/artigo→QID (sem fuzzy) usado tanto na
// resolução do acervo (script) quanto no casamento PT↔EN do cross-check.
// Fonte dos QIDs: Wikidata via sitelinks enwiki (wbgetentities), conferidos
// contra a validação do scout T606 (Palmeiras Q80964, Flamengo Q413160,
// IDV Q249648, Universitario Q19066, Atlético-MG Q270995, Boca Q170703,
// Cerro Porteño Q914086, Fluminense Q80987, Barcelona SC Q248782, Vélez
// Q215163, São Paulo Q38568, Racing Q276533, River Q15799, Olimpia Q604589,
// Inter Q80845, Argentinos Q220621, Defensa y Justicia Q1024338).
// Chaves cobrem as variantes EN e PT (artigo canônico + nome comum).
// ---------------------------------------------------------------------------
export const CLUB_QID_MAP: Record<string, string> = {
  // ARG
  bocajuniors: 'Q170703',
  clubatleticobocajuniors: 'Q170703',
  boca: 'Q170703',
  riverplate: 'Q15799',
  clubatleticoriverplate: 'Q15799',
  argentinosjuniors: 'Q220621',
  asociacionatleticaargentinosjuniors: 'Q220621',
  racing: 'Q276533',
  racingclub: 'Q276533',
  racingclubdeavellaneda: 'Q276533',
  velezsarsfield: 'Q215163',
  clubatleticovelezsarsfield: 'Q215163',
  velez: 'Q215163',
  defensayjusticia: 'Q1024338',
  clubsocialydeportivodefensayjusticia: 'Q1024338',
  // BOL
  alwaysready: 'Q1102942',
  clubalwaysready: 'Q1102942',
  thestrongest: 'Q128020',
  clubthestrongest: 'Q128020',
  // BRA
  atleticomineiro: 'Q270995',
  clubeatleticomineiro: 'Q270995',
  atleticomg: 'Q270995',
  flamengo: 'Q413160',
  clubederegatasdoflamengo: 'Q413160',
  fluminense: 'Q80987',
  fluminensefootballclub: 'Q80987',
  fluminensefc: 'Q80987',
  internacional: 'Q80845',
  sportclubinternacional: 'Q80845',
  inter: 'Q80845',
  palmeiras: 'Q80964',
  sociedadeesportivapalmeiras: 'Q80964',
  santos: 'Q80955',
  santosfc: 'Q80955',
  santosfutebolclube: 'Q80955',
  saopaulo: 'Q38568',
  saopaulofc: 'Q38568',
  saopaulofutebolclube: 'Q38568',
  // CHI
  unionlacalera: 'Q719383',
  clubdedeportesunionlacalera: 'Q719383',
  universidadcatolica: 'Q427446',
  clubdeportivouniversidadcatolica: 'Q427446',
  // COL
  americadecali: 'Q391987',
  atleticonacional: 'Q332605',
  junior: 'Q332524',
  atleticojunior: 'Q332524',
  clubdeportivopopularjuniorfutbolclub: 'Q332524',
  // ECU
  barcelona: 'Q248782',
  barcelonasc: 'Q248782',
  barcelonasportingclub: 'Q248782',
  independientedelvalle: 'Q249648',
  csdindependientedelvalle: 'Q249648',
  idv: 'Q249648',
  lduquito: 'Q249643',
  ligadeportivauniversitariadequito: 'Q249643',
  ligadeportivauniversitariaquito: 'Q249643',
  // PAR
  cerroporteno: 'Q914086',
  clubcerroporteno: 'Q914086',
  olimpia: 'Q604589',
  clubolimpia: 'Q604589',
  // PER
  universitario: 'Q19066',
  clubuniversitariodedeportes: 'Q19066',
  sportingcristal: 'Q604581',
  clubsportingcristal: 'Q604581',
  // URU
  nacional: 'Q499616',
  clubnacionaldefootball: 'Q499616',
  rentistas: 'Q1022933',
  clubatleticorentistas: 'Q1022933',
  carentistas: 'Q1022933',
  // VEN
  deportivolaguaira: 'Q628860',
  deportivolaguairafc: 'Q628860',
  deportivotachira: 'Q178378',
  deportivotachirafc: 'Q178378',
  deportivotachirafutbolclub: 'Q178378',
  santafe: 'Q1424072',
  independientesantafe: 'Q1424072',
};

/**
 * Normaliza nome/artigo para chave do mapa: minúsculas, sem acentos, só
 * alfanumérico ("São Paulo FC", "São PauloFC" e "São_Paulo_FC" → "saopaulofc";
 * "C.S.D. Independiente del Valle" → "csdindependientedelvalle"). Sem fuzzy:
 * chaves extras ("bocaunidos") simplesmente NÃO existem no mapa.
 */
export function normalizeTeamKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** nome/artigo da fonte → QID do mapa fixo (fora do mapa = null, NUNCA chute). */
export function resolveTeamQid(nameOrArticle: string): string | null {
  return CLUB_QID_MAP[normalizeTeamKey(nameOrArticle)] ?? null;
}

// ---------------------------------------------------------------------------
// Cross-check PT↔EN + merge do venue. Casamento por IDENTIDADE (grupo + data +
// QID dos dois lados, via mapa fixo); o índice dentro do grupo é só fallback
// (os 96 jogos aparecem em ordem cronológica nas duas fontes, mas a ordem de
// EMPATES de data difere — o índice sozinho produz falso "divergência").
// Placar divergente vira AVISO e NUNCA sobrescreve o EN.
// ---------------------------------------------------------------------------
const identityKey = (m: WikiMatchParsed): string | null => {
  if (!m.dateIso) return null;
  const home = resolveTeamQid(m.homeArticle ?? m.homeTeam);
  const away = resolveTeamQid(m.awayArticle ?? m.awayTeam);
  if (!home || !away) return null;
  return `${m.group}|${m.dateIso}|${home}|${away}`;
};

export function mergePtEnrichment(
  en: WikiMatchParsed[],
  pt: WikiMatchParsed[],
): { matches: WikiMatchParsed[]; warnings: string[] } {
  const warnings: string[] = [];
  const byKey = new Map<string, WikiMatchParsed>();
  for (const m of pt) {
    const k = identityKey(m);
    if (k) byKey.set(k, m);
  }
  const byGroup = new Map<string, WikiMatchParsed[]>();
  for (const m of pt) {
    const list = byGroup.get(m.group) ?? [];
    list.push(m);
    byGroup.set(m.group, list);
  }
  const seen = new Map<string, number>();
  const merged = en.map((m) => {
    const k = identityKey(m);
    let candidate: WikiMatchParsed | undefined = k ? byKey.get(k) : undefined;
    if (!candidate) {
      // Fallback: ordem dentro do grupo (casamento por data conferida).
      const idx = seen.get(m.group) ?? 0;
      seen.set(m.group, idx + 1);
      const ptList = byGroup.get(m.group) ?? [];
      const c = ptList[idx];
      if (c && m.dateIso && c.dateIso && m.dateIso.slice(5) === c.dateIso.slice(5)) {
        candidate = c;
      }
    }
    if (!candidate) return { ...m };
    if (candidate.homeScore !== m.homeScore || candidate.awayScore !== m.awayScore) {
      warnings.push(
        `divergência de placar PT↔EN: ${m.group} ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (PT: ${candidate.homeScore}-${candidate.awayScore}) — EN mantido`,
      );
      return { ...m };
    }
    return { ...m, venue: candidate.venue ?? null };
  });
  return { matches: merged, warnings };
}

/**
 * Orquestrador: EN primário; PT opcional (cross-check + venue). Jogo do EN sem
 * placar NÃO entra (não inventa); sem data entra com dateIso=null (o script
 * conta como skip honesto).
 */
export function parseWikipediaGroupMatches(
  enHtml: string,
  opts: { ptHtml?: string; seasonYear?: number } = {},
): { matches: WikiMatchParsed[]; warnings: string[] } {
  const en = parseWikipediaMatchesEn(enHtml);
  const warnings = [...en.warnings];
  let matches = en.matches;
  if (opts.ptHtml) {
    const pt = parseWikipediaMatchesPt(opts.ptHtml, opts.seasonYear ?? 2021);
    warnings.push(...pt.warnings);
    const enriched = mergePtEnrichment(en.matches, pt.matches);
    matches = enriched.matches;
    warnings.push(...enriched.warnings);
  }
  return { matches, warnings };
}
