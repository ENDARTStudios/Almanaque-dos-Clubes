/**
 * T450 Wave 3 — connector puro de clubes brasileiros de futebol feminino
 * a partir de fontes abertas alternativas (após a descoberta estrutural da
 * wave 2: Wikidata não cobria BR feminino).
 *
 * Fontes APROVADAS (docs/T450-WAVE3-SOURCES.md):
 *   - `wikipedia-pt`: categorias de clubes femininos + tabelas de participantes
 *     das temporadas 2026 (Série A1/A2/A3) via MediaWiki API (CC BY-SA 4.0 para
 *     texto; fatos extraídos com atribuição por sourceUrl; robots.txt permite
 *     /w/api.php).
 *   - `wikidata`: re-check WDQS (CC0) — 16 clubes BR femininos populados desde
 *     a wave 2, usados para QID/founded/coords e dedup.
 *
 * Fontes DESCARTADAS (nunca buscadas — guard de ToS/teste):
 *   - `cbf-public`: sem API pública/robots.txt (SPA JS) — scraping agressivo.
 *   - `thesportsdb`: chave grátis é dev-only (produto monetizado) + cobertura
 *     feminina BR marginal (0 resultados na sondagem).
 *
 * Este módulo é PURO: HTTP (throttle 1 req/s, UA, backoff) e Prisma vivem no
 * script `seed-brazilian-women-football-v2.ts`. Toda entrada externa é
 * validada com Zod. Integridade: NUNCA sobrescreve clube/competição existente
 * (match por QID ou slug) e não toca rankings/entries.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------
export const W3_USER_AGENT =
  'AlmanaqueDosClubes-ETL/3.0 (https://almanaquedosclubes.com; github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const W3_DATASOURCE = 'wikipedia-pt' as const;
export const W3_WIKIDATA_DATASOURCE = 'wikidata' as const;
export const W3_WAVE = 3 as const;
export const W3_COUNTRY = 'BR' as const;

/** Raiz do levantamento por categorias. */
export const W3_ROOT_CATEGORY = 'Categoria:Clubes de futebol feminino do Brasil';

/** Temporadas 2026 com tabela de participantes estruturada (verificadas 10-08). */
export interface W3SeasonPage {
  article: string;
  competition: string;
  level: 1 | 2 | 3;
  season: string;
}
export const W3_SEASON_PAGES: readonly W3SeasonPage[] = [
  {
    article: 'Campeonato Brasileiro de Futebol Feminino de 2026',
    competition: 'Campeonato Brasileiro de Futebol Feminino - Série A1',
    level: 1,
    season: '2026',
  },
  {
    article: 'Campeonato Brasileiro de Futebol Feminino de 2026 - Série A2',
    competition: 'Campeonato Brasileiro de Futebol Feminino - Série A2',
    level: 2,
    season: '2026',
  },
  {
    article: 'Campeonato Brasileiro de Futebol Feminino de 2026 - Série A3',
    competition: 'Campeonato Brasileiro de Futebol Feminino - Série A3',
    level: 3,
    season: '2026',
  },
];

/** ToS guard — somente fontes com licença/ToS verificados são processadas. */
export const W3_APPROVED_SOURCES = ['wikipedia-pt', 'wikidata'] as const;
export type W3ApprovedSource = (typeof W3_APPROVED_SOURCES)[number];

export class W3UnapprovedSourceError extends Error {
  constructor(source: string) {
    super(
      `Fonte não aprovada pelo levantamento T450-WAVE3: "${source}" (docs/T450-WAVE3-SOURCES.md)`,
    );
    this.name = 'W3UnapprovedSourceError';
  }
}

export function assertSourceApproved(source: string): asserts source is W3ApprovedSource {
  if (!(W3_APPROVED_SOURCES as readonly string[]).includes(source)) {
    throw new W3UnapprovedSourceError(source);
  }
}

/** Filtro usado pelo script: fonte descartada NUNCA vira requisição. */
export function filterApprovedSources<T extends { source: string }>(items: T[]): T[] {
  return items.filter((i) => (W3_APPROVED_SOURCES as readonly string[]).includes(i.source));
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface W3CompetitionLink {
  name: string;
  level: number | null;
  season: string;
  sourceUrl: string;
}

export interface W3ClubInput {
  name: string;
  fullName: string | null;
  shortName: string | null;
  city: string | null;
  state: string | null; // UF
  country: string; // 'BR'
  foundedYear: number | null;
  latitude: number | null;
  longitude: number | null;
  qid: string | null;
  source: W3ApprovedSource;
  sourceUrl: string;
  competitions: W3CompetitionLink[];
}

export interface W3MergeStats {
  wikipedia: number;
  wikidataOnly: number;
  crossMatched: number;
}

export interface ExistingClubRow {
  id: string;
  qid: string | null;
  name: string;
  state: string | null;
  gender: string;
  deletedAt: Date | null;
}

export interface ExistingCompRow {
  id: string;
  name: string;
  country: string | null;
  gender: string;
  deletedAt: Date | null;
}

export type W3PlanAction = 'create' | 'skip_existing' | 'refused';

export interface W3PlanEntry {
  input: W3ClubInput;
  finalName: string;
  action: W3PlanAction;
  reason: string | null;
}

export interface W3SeedPlan {
  plan: W3PlanEntry[];
  wouldCreate: number;
  skips: number;
  refusals: Array<{ name: string; reason: string }>;
  duplicatesInBatch: number;
}

export interface W3CompetitionCreate {
  name: string;
  level: number;
  season: string;
  sourceUrl: string;
}

export interface W3EdgePlan {
  clubSlugKey: string;
  compSlugKey: string;
  season: string;
  sourceUrl: string;
}

export interface W3CompetitionsPlan {
  compsToCreate: W3CompetitionCreate[];
  edges: W3EdgePlan[];
  duplicatesInBatch: number;
}

// ---------------------------------------------------------------------------
// UF — nome por extenso → sigla (subcategorias usam nome por extenso)
// ---------------------------------------------------------------------------
const UF_BY_NAME: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  goiás: 'GO',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  pará: 'PA',
  paraíba: 'PB',
  paraná: 'PR',
  pernambuco: 'PE',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

/** "Clubes de futebol feminino do estado de São Paulo" → "SP". */
export function stateFromCategoryTitle(title: string): string | null {
  const m = /Clubes de futebol feminino (?:do|de|da) (?:estado de )?(.+)$/i.exec(title);
  if (!m) return null;
  return UF_BY_NAME[m[1].trim().toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Slug — identidade estável sem QID
// ---------------------------------------------------------------------------
export function slugify(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Chave de clube: sufixo "(futebol feminino)" FAZ PARTE do slug — o time
 *  feminino de clube homônimo nunca colide com o clube masculino do acervo. */
export function clubSlug(name: string, state: string | null): string {
  return `${slugify(name)}::${slugify(state ?? 'br')}`;
}

/** Chave de competição — exportada para o script montar o mapa de ids
 *  com EXATAMENTE o mesmo formato das arestas do plano. */
export function competitionSlugKey(name: string, country: string | null): string {
  return `${slugify(name)}::${slugify(country ?? 'br')}`;
}

export function ptWikiUrl(title: string): string {
  return `https://pt.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

/** Remove o sufixo canônico de seção feminina, para checar colisão homônima. */
export function stripFeminineSuffix(name: string): string {
  return name.replace(/\s*\(futebol feminino\)\s*$/i, '').trim();
}

// ---------------------------------------------------------------------------
// Zod — payloads externos
// ---------------------------------------------------------------------------
const CategoryMembersPayload = z.object({
  query: z
    .object({
      categorymembers: z
        .array(z.object({ pageid: z.number(), ns: z.number(), title: z.string().min(1) }))
        .default([]),
    })
    .default({ categorymembers: [] }),
});

const TemplateContentPayload = z.object({
  query: z.object({
    pages: z
      .array(
        z
          .object({
            title: z.string(),
            missing: z.boolean().optional(),
            revisions: z
              .array(z.object({ slots: z.object({ main: z.object({ content: z.string() }) }) }))
              .optional(),
          })
          .passthrough(),
      )
      .default([]),
  }),
});

const WdqsBinding = z.object({
  item: z.object({ value: z.string().regex(/^https?:\/\/www\.wikidata\.org\/entity\/Q\d+$/) }),
  itemLabel: z.object({ value: z.string().min(1) }),
  coord: z.object({ value: z.string() }).optional(),
  founded: z.object({ value: z.string() }).optional(),
  cityLabel: z.object({ value: z.string() }).optional(),
});
const WdqsPayload = z.object({ results: z.object({ bindings: z.array(WdqsBinding).default([]) }) });

// ---------------------------------------------------------------------------
// Parsers — categorias
// ---------------------------------------------------------------------------
export interface W3CategoryMember {
  title: string;
  ns: number;
}

export function parseCategoryMembers(rawBody: string): {
  pages: W3CategoryMember[];
  subcats: string[];
} {
  const payload = CategoryMembersPayload.parse(JSON.parse(rawBody));
  const pages: W3CategoryMember[] = [];
  const subcats: string[] = [];
  for (const m of payload.query.categorymembers) {
    if (m.ns === 14) subcats.push(m.title);
    else if (m.ns === 0 && !m.title.includes('/') && !/\(desambigua/i.test(m.title)) {
      pages.push({ title: m.title, ns: 0 });
    }
  }
  return { pages, subcats };
}

// ---------------------------------------------------------------------------
// Parsers — tabelas de temporada ({{Futebol X}} + [[Cidade]] + {{BR-UF}})
// ---------------------------------------------------------------------------
const TEMPLATE_RE = /\{\{(Futebol [^{}|]+)\}\}/g;
const UF_RE = /\{\{BR-([A-Z]{2})\}\}/;
const LINK_RE = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/;

export interface W3SeasonRow {
  templates: string[];
  uf: string | null;
  city: string | null;
}

export function parseSeasonParticipants(wikitext: string): W3SeasonRow[] {
  const rows: W3SeasonRow[] = [];
  for (const line of wikitext.split('\n')) {
    if (!line.startsWith('|') || !/\{\{Futebol /.test(line)) continue;
    const templates: string[] = [];
    TEMPLATE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    let lastEnd = -1;
    while ((m = TEMPLATE_RE.exec(line)) !== null) {
      templates.push(m[1].trim());
      lastEnd = m.index + m[0].length;
    }
    if (templates.length === 0) continue;
    const ufMatch = UF_RE.exec(line);
    let city: string | null = null;
    if (ufMatch && lastEnd < ufMatch.index) {
      // Coluna entre o template e a UF na A1 é a cidade; na A2/A3 é vazia.
      const segment = line.slice(lastEnd, ufMatch.index);
      const cityMatch = LINK_RE.exec(segment);
      if (cityMatch && !cityMatch[1].includes(':')) city = cityMatch[1].trim();
    }
    rows.push({ templates, uf: ufMatch ? ufMatch[1] : null, city });
  }
  return rows;
}

export interface W3TemplateResolution {
  target: string | null;
  display: string | null;
}

/** Primeiro link interno de namespace principal (interwiki/namespace → ignora). */
export function resolveTemplateToArticle(templateWikitext: string): W3TemplateResolution {
  const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(templateWikitext)) !== null) {
    if (m[1].includes(':')) continue; // [[:en:…]], [[:Categoria:…]], etc.
    return { target: m[1].trim(), display: m[2]?.trim() ?? null };
  }
  return { target: null, display: null };
}

export function parseTemplateBatch(rawBody: string): Map<string, W3TemplateResolution> {
  const payload = TemplateContentPayload.parse(JSON.parse(rawBody));
  const out = new Map<string, W3TemplateResolution>();
  for (const page of payload.query.pages) {
    if (page.missing || !page.revisions?.length) continue;
    out.set(
      page.title.replace(/^Predefinição:/, ''),
      resolveTemplateToArticle(page.revisions[0]!.slots.main.content),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parsers — Wikidata (WDQS, CC0)
// ---------------------------------------------------------------------------
export interface W3WikidataClub {
  qid: string;
  label: string;
  city: string | null;
  foundedYear: number | null;
  latitude: number | null;
  longitude: number | null;
}

/** WKT "Point(-46.57 -23.54)" → (lat=-23.54, lng=-46.57). */
export function parseWktPoint(wkt: string): { latitude: number; longitude: number } | null {
  const m = /Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)/.exec(wkt);
  if (!m) return null;
  return { longitude: Number(m[1]), latitude: Number(m[2]) };
}

export function parseWdqs(rawBody: string): W3WikidataClub[] {
  const payload = WdqsPayload.parse(JSON.parse(rawBody));
  const out: W3WikidataClub[] = [];
  for (const b of payload.results.bindings) {
    const qid = b.item.value.split('/').pop() ?? null;
    if (!qid) continue;
    const coord = b.coord ? parseWktPoint(b.coord.value) : null;
    const founded = b.founded ? Number(b.founded.value.slice(0, 4)) : null;
    out.push({
      qid,
      label: b.itemLabel.value,
      city: b.cityLabel?.value ?? null,
      foundedYear: Number.isFinite(founded) ? founded : null,
      latitude: coord?.latitude ?? null,
      longitude: coord?.longitude ?? null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Construtores de W3ClubInput (proveniência obrigatória)
// ---------------------------------------------------------------------------
export function buildClubInputFromCategory(title: string, state: string | null): W3ClubInput {
  return {
    name: title,
    fullName: title,
    shortName: null,
    city: null,
    state,
    country: W3_COUNTRY,
    foundedYear: null,
    latitude: null,
    longitude: null,
    qid: null,
    source: W3_DATASOURCE,
    sourceUrl: ptWikiUrl(title),
    competitions: [],
  };
}

export function seasonRowsToInputs(
  rows: W3SeasonRow[],
  templateMap: Map<string, W3TemplateResolution>,
  comp: { name: string; level: number; season: string; sourceUrl: string },
  refusals: Array<{ name: string; reason: string }>,
): W3ClubInput[] {
  const inputs: W3ClubInput[] = [];
  for (const row of rows) {
    for (const template of row.templates) {
      const res = templateMap.get(template);
      if (!res?.target) {
        refusals.push({ name: template, reason: 'template_sem_artigo_resolvido' });
        continue;
      }
      inputs.push({
        name: res.target,
        fullName: res.target,
        shortName: res.display,
        city: row.city,
        state: row.uf,
        country: W3_COUNTRY,
        foundedYear: null,
        latitude: null,
        longitude: null,
        qid: null,
        source: W3_DATASOURCE,
        sourceUrl: ptWikiUrl(res.target),
        competitions: [
          { name: comp.name, level: comp.level, season: comp.season, sourceUrl: comp.sourceUrl },
        ],
      });
    }
  }
  return inputs;
}

export function buildClubInputFromWikidata(wd: W3WikidataClub): W3ClubInput {
  return {
    name: wd.label,
    fullName: wd.label,
    shortName: null,
    city: wd.city,
    state: null,
    country: W3_COUNTRY,
    foundedYear: wd.foundedYear,
    latitude: wd.latitude,
    longitude: wd.longitude,
    qid: wd.qid,
    source: W3_WIKIDATA_DATASOURCE,
    sourceUrl: `https://www.wikidata.org/wiki/${wd.qid}`,
    competitions: [],
  };
}

// ---------------------------------------------------------------------------
// Merge — wikipedia (categorias+temporadas) ⊕ wikidata, dedup por slug
// ---------------------------------------------------------------------------
function fillMissing(target: W3ClubInput, from: W3ClubInput): W3ClubInput {
  return {
    ...target,
    city: target.city ?? from.city,
    state: target.state ?? from.state,
    foundedYear: target.foundedYear ?? from.foundedYear,
    latitude: target.latitude ?? from.latitude,
    longitude: target.longitude ?? from.longitude,
    qid: target.qid ?? from.qid,
    shortName: target.shortName ?? from.shortName,
    fullName: target.fullName ?? from.fullName,
  };
}

function mergeCompetitions(a: W3CompetitionLink[], b: W3CompetitionLink[]): W3CompetitionLink[] {
  const seen = new Set(a.map((c) => `${c.name}::${c.season}`));
  return [...a, ...b.filter((c) => !seen.has(`${c.name}::${c.season}`))];
}

export function mergeW3Inputs(
  wikipediaInputs: W3ClubInput[],
  wikidataInputs: W3ClubInput[],
): { merged: W3ClubInput[]; stats: W3MergeStats } {
  const bySlug = new Map<string, W3ClubInput>();
  let wikipedia = 0;
  for (const input of wikipediaInputs) {
    const key = clubSlug(input.name, input.state);
    const existing = bySlug.get(key);
    if (!existing) {
      bySlug.set(key, { ...input });
      wikipedia += 1;
    } else {
      const merged = fillMissing(existing, input);
      merged.competitions = mergeCompetitions(existing.competitions, input.competitions);
      bySlug.set(key, merged);
    }
  }
  let wikidataOnly = 0;
  let crossMatched = 0;
  for (const wd of wikidataInputs) {
    // Match por QID direto (entrada wikipedia já enriquecida) ou por slug.
    let key: string | null = null;
    for (const [k, v] of bySlug) {
      if (v.qid && wd.qid && v.qid === wd.qid) {
        key = k;
        break;
      }
    }
    if (!key) {
      key = clubSlug(wd.name, wd.state);
      if (!bySlug.has(key)) {
        // Tenta também o nome sem variação de sufixo feminino.
        const stripped = clubSlug(stripFeminineSuffix(wd.name), wd.state);
        if (bySlug.has(stripped)) key = stripped;
      }
    }
    const existing = key ? bySlug.get(key) : undefined;
    if (existing) {
      crossMatched += 1;
      bySlug.set(key!, fillMissing(existing, wd));
    } else {
      wikidataOnly += 1;
      bySlug.set(clubSlug(wd.name, wd.state), { ...wd });
    }
  }
  // Consolidação final: mesmo nome (slug stateless) com UFs distintas só fica
  // separado se AMBAS tiverem estado; entrada sem estado (típico do WD) é
  // dobrada na entrada informada — evita clubes duplicados no lote.
  const byNameSlug = new Map<string, string[]>();
  for (const k of bySlug.keys()) {
    const nameSlug = k.split('::')[0]!;
    byNameSlug.set(nameSlug, [...(byNameSlug.get(nameSlug) ?? []), k]);
  }
  for (const keys of byNameSlug.values()) {
    if (keys.length < 2) continue;
    const withState = keys.filter((k) => !k.endsWith('::br'));
    if (withState.length !== 1) continue;
    const keep = bySlug.get(withState[0]!)!;
    for (const k of keys) {
      if (k === withState[0]!) continue;
      const folded = bySlug.get(k)!;
      if (folded.source !== keep.source) crossMatched += 1;
      bySlug.set(withState[0]!, fillMissing(keep, folded));
      bySlug.delete(k);
    }
  }
  return { merged: [...bySlug.values()], stats: { wikipedia, wikidataOnly, crossMatched } };
}

// ---------------------------------------------------------------------------
// Plan — zero overwrite vs acervo
// ---------------------------------------------------------------------------
const FEMININE_SUFFIX = ' (futebol feminino)';

export function planW3Seed(inputs: W3ClubInput[], existing: ExistingClubRow[]): W3SeedPlan {
  const plan: W3PlanEntry[] = [];
  const refusals: Array<{ name: string; reason: string }> = [];
  let wouldCreate = 0;
  let skips = 0;
  let duplicatesInBatch = 0;

  const byQid = new Map(existing.filter((c) => c.qid).map((c) => [c.qid!, c]));
  const bySlug = new Map(existing.map((c) => [clubSlug(c.name, c.state), c]));
  const batchSeen = new Set<string>();

  for (const input of inputs) {
    if (!input.name.trim()) {
      refusals.push({ name: input.name, reason: 'nome_vazio' });
      plan.push({ input, finalName: input.name, action: 'refused', reason: 'nome_vazio' });
      continue;
    }
    const key = clubSlug(input.name, input.state);
    if (batchSeen.has(key)) {
      duplicatesInBatch += 1;
      continue;
    }
    batchSeen.add(key);

    if (input.qid && byQid.has(input.qid)) {
      skips += 1;
      plan.push({
        input,
        finalName: input.name,
        action: 'skip_existing',
        reason: 'qid_ja_no_acervo',
      });
      continue;
    }
    if (bySlug.has(key)) {
      const hit = bySlug.get(key)!;
      const stripped = stripFeminineSuffix(input.name);
      // Entidade feminina/mista já existe com esse slug → identidade batida (skip).
      if (hit.gender !== 'men' || stripped !== input.name) {
        skips += 1;
        plan.push({
          input,
          finalName: input.name,
          action: 'skip_existing',
          reason: 'slug_ja_no_acervo',
        });
        continue;
      }
      // Entrada de time feminino colide com o CLUBE MASCULINO homônimo →
      // sufixo canônico da própria Wikipedia (nem engole, nem duplica).
      const finalName = `${input.name}${FEMININE_SUFFIX}`;
      if (bySlug.has(clubSlug(finalName, input.state))) {
        skips += 1;
        plan.push({ input, finalName, action: 'skip_existing', reason: 'sufixo_tambem_existente' });
        continue;
      }
      wouldCreate += 1;
      plan.push({ input, finalName, action: 'create', reason: null });
      continue;
    }
    wouldCreate += 1;
    plan.push({ input, finalName: input.name, action: 'create', reason: null });
  }
  return { plan, wouldCreate, skips, refusals, duplicatesInBatch };
}

// ---------------------------------------------------------------------------
// Plan — competições (find-or-create por slug+país+gênero) + arestas
// ---------------------------------------------------------------------------
export const W3_EDGE_RELATION = 'PARTICIPATED_IN' as const;

export function planW3Competitions(
  inputs: W3ClubInput[],
  existingComps: ExistingCompRow[],
): W3CompetitionsPlan {
  const existingKeys = new Set(
    existingComps
      .filter((c) => c.gender === 'women' && !c.deletedAt)
      .map((c) => competitionSlugKey(c.name, c.country)),
  );
  const compsToCreate: W3CompetitionCreate[] = [];
  const plannedKeys = new Set<string>();
  const edges: W3EdgePlan[] = [];
  const edgeKeys = new Set<string>();
  let duplicatesInBatch = 0;

  for (const input of inputs) {
    for (const comp of input.competitions) {
      const key = competitionSlugKey(comp.name, W3_COUNTRY);
      if (!existingKeys.has(key) && !plannedKeys.has(key)) {
        plannedKeys.add(key);
        compsToCreate.push({
          name: comp.name,
          level: comp.level ?? 0,
          season: comp.season,
          sourceUrl: comp.sourceUrl,
        });
      }
      const edgeKey = `${clubSlug(input.name, input.state)}>>${key}::${comp.season}`;
      if (edgeKeys.has(edgeKey)) {
        duplicatesInBatch += 1;
        continue;
      }
      edgeKeys.add(edgeKey);
      edges.push({
        clubSlugKey: clubSlug(input.name, input.state),
        compSlugKey: key,
        season: comp.season,
        sourceUrl: comp.sourceUrl,
      });
    }
  }
  return { compsToCreate, edges, duplicatesInBatch };
}
