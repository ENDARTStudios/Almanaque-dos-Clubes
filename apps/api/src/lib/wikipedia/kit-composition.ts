/**
 * T523-kits — composição de uniformes a partir das chamadas `{{CamisaFutebol}}`
 * da pt.Wikipédia. Fetch dos dois endpoints públicos (wikitexto do artigo e
 * imageinfo do Commons). Sem Prisma/env — importável por testes e scripts.
 *
 * Fonte e honestidade (medido no discovery):
 *  - o Commons não tem "uniforme por temporada" pronto; tem PEÇAS de padrão do
 *    template (corpo, mangas, calção, meião — `File:Kit body <padrão>.png`),
 *    muitas com temporada no código (`fluminense23h` = 2023 titular);
 *  - a composição (padrão + cor por parte, tipo da peça) vive nas chamadas do
 *    template no wikitexto dos artigos/subpredefinições `Uniformes do X`;
 *  - peça sem arquivo verificado vira cor sólida; temporada só entra se o
 *    CÓDIGO da peça a indica; código sem ano → season=null.
 */
import { setTimeout as sleep } from 'node:timers/promises';

const UA =
  'AlmanaqueDosClubes/0.1 (kits seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

export interface KitPart {
  /** Token do padrão (sem o `_` inicial); null = parte de cor sólida. */
  pattern: string | null;
  /** Cor de fundo (hex sem `#`); null quando a fonte não declara. */
  color: string | null;
  /** Título do arquivo no Commons quando verificado (existe, licença, sem exclusão). */
  file: string | null;
  fileUrl: string | null;
  license: string | null;
}

export interface KitEntry {
  season: string | null;
  type: 'home' | 'away' | 'third' | 'fourth' | 'goalkeeper' | 'training' | 'other';
  label: string;
  parts: {
    leftarm: KitPart;
    body: KitPart;
    rightarm: KitPart;
    shorts: KitPart;
    socks: KitPart;
  };
  sourceUrl: string;
  /** T523 — uniforme com IMAGEM única (foto/render curado) em vez de composição. */
  image?: { url: string; sourceUrl: string; license: string };
}

export interface RawKitCall {
  title: string;
  section: 'players' | 'goalkeepers' | 'training' | 'other';
  params: Record<string, string>;
  sourceUrl: string;
  /** Índice da chamada no wikitexto — base do ordinal (coluna da tabela). */
  start: number;
  /** Posição no run contíguo (0 = 1ª coluna = titular). */
  ordinal: number;
}

const GOALKEEPERS_RE = /;\s*Uniformes dos goleiros/gi;
const TRAINING_RE = /;\s*Uniformes de treino/gi;
const CALL_RE = /\{\{\s*CamisaFutebol\b([^{}]*)\}\}/gi;
const PARAM_RE = /^\s*\|\s*([a-zA-Z_0-9]+)\s*=\s*(.*?)\s*$/;

/**
 * Extrai as chamadas `{{CamisaFutebol ...}}` com a seção em que aparecem e o
 * ordinal na tabela (chamadas contíguas no wikitexto são colunas da mesma
 * tabela: 1ª = titular, 2ª = reserva, 3ª = terceiro…).
 */
export function parseKitCalls(wikitext: string, sourceUrl: string): RawKitCall[] {
  const sectionMarks: Array<{ idx: number; section: RawKitCall['section'] }> = [];
  let m: RegExpExecArray | null;
  while ((m = GOALKEEPERS_RE.exec(wikitext)))
    sectionMarks.push({ idx: m.index, section: 'goalkeepers' });
  while ((m = TRAINING_RE.exec(wikitext))) sectionMarks.push({ idx: m.index, section: 'training' });

  const raw: RawKitCall[] = [];
  while ((m = CALL_RE.exec(wikitext))) {
    const params: Record<string, string> = {};
    for (const line of m[1].split(/\n/)) {
      const pm = PARAM_RE.exec(line);
      if (pm) params[pm[1].toLowerCase()] = pm[2];
    }
    const section = sectionMarks.filter((sm) => sm.idx < m!.index).at(-1)?.section ?? 'players';
    raw.push({
      title: (params['title'] ?? '').trim(),
      section,
      params,
      sourceUrl,
      start: m.index,
      ordinal: 0,
    });
  }
  for (let i = 0; i < raw.length; i++) {
    raw[i].ordinal = i > 0 && raw[i].start - raw[i - 1].start <= 400 ? raw[i - 1].ordinal + 1 : 0;
  }
  return raw;
}

export function typeFromCall(c: RawKitCall, patterns: Array<string | null>): KitEntry['type'] {
  if (c.section === 'goalkeepers') return 'goalkeeper';
  if (c.section === 'training') return 'training';
  const t = c.title.toLowerCase();
  if (t.includes('goleiro')) return 'goalkeeper';
  if (t.includes('técnica') || t.includes('treino')) return 'training';
  if (t.includes('primeiro') || t.includes('1º')) return 'home';
  if (t.includes('segundo') || t.includes('2º')) return 'away';
  if (t.includes('terceiro') || t.includes('3º')) return 'third';
  if (t.includes('quarto')) return 'fourth';
  // O CÓDIGO da peça é a convenção da própria fonte: `23g1` = goleiro 1 de 2023,
  // `23tr2` = treino 2, `26h` = titular, `26a` = reserva, `2627t` = terceiro.
  // O CÓDIGO do CORPO é o identificador do uniforme: `23g1` = goleiro, `23tr` =
  // treino, `26h` = titular, `26a` = reserva, `2627t` = terceiro.
  const body = patterns[1] ?? '';
  if (/gk/i.test(body) || /g\d($|\D)/.test(body)) return 'goalkeeper';
  if (/tr\d/.test(body)) return 'training';
  const map: Record<string, KitEntry['type']> = { h: 'home', a: 'away', t: 'third' };
  const bodySuffix = /\d([hat])(?:\d*y)?$/i.exec(body);
  if (bodySuffix) return map[bodySuffix[1].toLowerCase()];
  // Título (alguns artigos rotulam "Quarto", "Goleiros"…).
  const joined = patterns.filter(Boolean).join(' ');
  if (/gk/i.test(joined) || /g\d($|\D)/.test(joined)) return 'goalkeeper';
  if (/tr\d/.test(joined)) return 'training';
  // Sem código de tipo: a ORDEM na tabela (1ª coluna = titular).
  if (c.ordinal === 0) return 'home';
  if (c.ordinal === 1) return 'away';
  if (c.ordinal === 2) return 'third';
  // Último recurso: sufixo em outra parte (a manga reserva emprestada não muda
  // o tipo do uniforme — por isso vem depois da ordem).
  for (const cand of [patterns[0], ...patterns.slice(2)]) {
    const suffix = /\d([hat])(?:\d*y)?$/i.exec(cand ?? '');
    if (suffix) return map[suffix[1].toLowerCase()];
  }
  return 'fourth';
}

/**
 * Recalcula os ordinais sobre a lista JÁ FILTRADA (sem chamadas de não-kit):
 * contiguidade no wikitexto (≤ 400 chars) = mesma tabela.
 */
export function recomputeOrdinals(calls: RawKitCall[]): void {
  for (let i = 0; i < calls.length; i++) {
    calls[i].ordinal =
      i > 0 && calls[i].start - calls[i - 1].start <= 400 ? calls[i - 1].ordinal + 1 : 0;
  }
}

/** Chamada que não é kit (link "Ver evolução", navegação) — fora. */
export function isNonKitCall(c: RawKitCall): boolean {
  return c.title.includes('[') || /ver evolu/i.test(c.title);
}

/**
 * Temporada a partir dos padrões das peças (regras revisadas no dry-run):
 *  - 4 dígitos plausível (1800–2099) → ano ("1903") ou temporada cruzada
 *    ("2627" → "2026-27", "2223" → "2022-23");
 *  - 2 dígitos no código → 20yy ("23" → 2023, "08" → 2008; ≥90 → 19yy);
 *  - sem token → null (uniforme corrente da fonte, sem ano declarado).
 */
export function decodeSeason(patterns: Array<string | null>): string | null {
  const tokens: string[] = [];
  for (const p of patterns) {
    if (!p) continue;
    for (const t of p.match(/\d{2,4}/g) ?? []) tokens.push(t);
  }
  for (const t of tokens) {
    if (!/^\d{4}$/.test(t)) continue;
    const n = Number(t);
    if (n >= 1800 && n <= 1999) return t; // 1910, 1903
    if (n >= 2000 && n <= 2099) {
      const next = tokens.find((x) => /^\d{4}$/.test(x) && Number(x) === n + 1);
      return next ? `${n}-${next.slice(2)}` : t; // 2022-23
    }
  }
  // 4 dígitos = duas dezenas consecutivas ("2627" → 2026-27, "0809" → 2008-09,
  // "1415" → 1914-15)
  for (const t of tokens) {
    if (!/^\d{4}$/.test(t)) continue;
    const a = Number(t.slice(0, 2));
    const b = Number(t.slice(2));
    if (b !== a + 1) continue;
    const century = a >= 90 ? '19' : '20'; // códigos de kit: 90s = 1990s; 00s+ = 2000s
    return `${century}${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
  }
  for (const t of tokens) {
    if (!/^\d{2}$/.test(t)) continue;
    const n = Number(t);
    if (n <= 79) return `20${t}`;
    if (n >= 90) return `19${t}`;
  }
  return null;
}

const PART_TO_FILE_PART: Record<string, string> = {
  leftarm: 'Kit left arm',
  body: 'Kit body',
  rightarm: 'Kit right arm',
  shorts: 'Kit shorts',
  socks: 'Kit socks',
};

/** Nome do parâmetro de padrão de cada parte no template (`pattern_b` = corpo). */
const PART_TO_PATTERN_PARAM: Record<string, string> = {
  leftarm: 'pattern_la',
  body: 'pattern_b',
  rightarm: 'pattern_ra',
  shorts: 'pattern_sh',
  socks: 'pattern_so',
};

const PART_KEYS = ['leftarm', 'body', 'rightarm', 'shorts', 'socks'] as const;

function colorOrNull(v: string | undefined): string | null {
  const c = (v ?? '').trim().toUpperCase();
  return /^[0-9A-F]{6}$/.test(c) ? c : null;
}

interface CommonsInfo {
  url: string | null;
  license: string | null;
  deleted: boolean;
}

/** Remove parâmetros de rastreamento (utm_*) da URL do arquivo. */
export function stripUtm(url: string): string {
  return url
    .replace(/([?&])utm_[^&]*/g, '$1')
    .replace(/\?&/, '?')
    .replace(/&$/, '')
    .replace(/\?$/, '');
}

async function commonsInfo(fileTitle: string): Promise<CommonsInfo | null> {
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      titles: fileTitle,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      format: 'json',
    });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              imageinfo?: Array<{
                url?: string;
                extmetadata?: Record<string, { value?: string }>;
              }>;
            }
          >;
        };
      };
      for (const p of Object.values(json.query?.pages ?? {})) {
        const ii = p.imageinfo?.[0];
        if (!ii) return { url: null, license: null, deleted: true };
        const em = ii.extmetadata ?? {};
        const clean = (k: string) =>
          em[k]?.value ? em[k].value.replace(/<[^>]+>/g, '').trim() : null;
        return {
          url: ii.url ? stripUtm(ii.url) : null,
          license: clean('LicenseShortName'),
          deleted: Boolean(clean('DeletionReason')),
        };
      }
      return null;
    } catch {
      await sleep(1500);
    }
  }
  return null;
}

/**
 * Monta as partes verificadas de uma chamada. Padrão sem arquivo verificado
 * (inexistente, deletado ou sem licença) vira cor sólida — nunca um <img> de
 * proveniência duvidosa.
 */
export async function buildParts(
  params: Record<string, string>,
  cache: Map<string, KitPart>,
): Promise<KitEntry['parts'] | null> {
  const parts = {} as KitEntry['parts'];
  let hasAny = false;
  for (const part of PART_KEYS) {
    const pattern = (params[PART_TO_PATTERN_PARAM[part]] ?? '').trim().replace(/^_/, '') || null;
    const color = colorOrNull(params[part]);
    const key = `${part}|${pattern ?? ''}`;
    let verified = pattern ? cache.get(key) : undefined;
    if (pattern && !verified) {
      const fileTitle = `File:${PART_TO_FILE_PART[part]} ${pattern}.png`;
      const info = await commonsInfo(fileTitle);
      if (info && !info.deleted && info.url != null && info.license != null) {
        verified = { pattern, color, file: fileTitle, fileUrl: info.url, license: info.license };
      } else {
        verified = { pattern, color, file: null, fileUrl: null, license: null };
      }
      cache.set(key, verified);
    }
    parts[part] = verified ?? { pattern, color, file: null, fileUrl: null, license: null };
    if (parts[part].pattern || parts[part].color) hasAny = true;
  }
  return hasAny ? parts : null;
}

/** Baixa o wikitexto de uma página da pt.Wikipédia (3 tentativas). */
export async function fetchWikitext(title: string): Promise<string | null> {
  const url =
    'https://pt.wikipedia.org/w/api.php?' +
    new URLSearchParams({ action: 'parse', page: title, prop: 'wikitext', format: 'json' });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { parse?: { wikitext?: { '*': string } } };
      return json.parse?.wikitext?.['*'] ?? null;
    } catch {
      await sleep(1500);
    }
  }
  return null;
}

/**
 * Segundo schema (pt.Wikipédia): uniformes como parâmetros NUMERADOS da infobox
 * do clube — `skin1` (padrão do corpo), `skin_be1`/`skin_bd1` (mangas),
 * `skin_calção1`, `skin_meia1` (padrões) e `corpo1`, `braçoesquerdo1`,
 * `braçodireito1`, `calções1`, `meias1` (cores). N = 1 titular, 2 reserva,
 * 3 terceiro…
 */
export function parseInfoboxKits(wikitext: string, sourceUrl: string): RawKitCall[] {
  const kitPattern = /^\s*\|\s*(skin(?:_be|_bd|_calção|_calcao|_meia)?)(\d)\s*=\s*(.*?)\s*$/;
  const colorPattern =
    /^\s*\|\s*(braçoesquerdo|corpo|braçodireito|calções|meias)(\d)\s*=\s*(.*?)\s*$/;
  const kits = new Map<number, { params: Record<string, string> }>();
  for (const line of wikitext.split(/\n/)) {
    const pm = kitPattern.exec(line);
    if (pm) {
      const n = Number(pm[2]);
      const kit = kits.get(n) ?? { params: {} };
      kit.params[pm[1].toLowerCase()] = pm[3];
      kits.set(n, kit);
      continue;
    }
    const cm = colorPattern.exec(line);
    if (cm) {
      const n = Number(cm[2]);
      const kit = kits.get(n) ?? { params: {} };
      kit.params[cm[1].toLowerCase()] = cm[3];
      kits.set(n, kit);
    }
  }
  const typeByN: Record<number, KitEntry['type']> = { 1: 'home', 2: 'away', 3: 'third' };
  const calls: RawKitCall[] = [];
  for (const [n, kit] of [...kits.entries()].sort((a, b) => a[0] - b[0])) {
    const params: Record<string, string> = {
      pattern_la: kit.params['skin_be'] ?? '',
      pattern_b: kit.params['skin'] ?? '',
      pattern_ra: kit.params['skin_bd'] ?? '',
      pattern_sh: kit.params['skin_calção'] ?? kit.params['skin_calcao'] ?? '',
      pattern_so: kit.params['skin_meia'] ?? '',
      leftarm: kit.params['braçoesquerdo'] ?? '',
      body: kit.params['corpo'] ?? '',
      rightarm: kit.params['braçodireito'] ?? '',
      shorts: kit.params['calções'] ?? '',
      socks: kit.params['meias'] ?? '',
    };
    calls.push({
      title: `Uniforme ${n}`,
      section: 'players',
      params,
      sourceUrl,
      start: n * 1e9,
      ordinal: n - 1, // N=1 → coluna 0 (titular), N=2 → reserva, N=3 → terceiro
    });
    void typeByN;
  }
  return calls;
}
