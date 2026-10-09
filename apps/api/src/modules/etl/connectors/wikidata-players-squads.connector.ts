/**
 * Mapeamento do portal / T034 (Operador, 09/10) — ingESTA de JOGADORES em escala
 * via Wikidata P54 (member of sports team), criando vínculos PLAYED_FOR que
 * alimentam os perfis de jogador.
 *
 * Diferenças para o connector de squads (T421, mantido intocado):
 *  - T421 só LINKA jogadores já no acervo (anti-órfão). Este módulo, quando
 *    autorizado pelo chamador (script com --apply), TAMBÉM CRIA o jogador
 *    ausente (insert-only, dedup por QID, proveniência obrigatória).
 *  - Traza dados do jogador (label, P569 nascimento, P27→ISO, P21 gênero,
 *    P413 posição) junto do vínculo P54 (P580/P582 início/fim).
 *
 * Fonte: Wikidata (CC0). Rate limit respeitado pelo chamador (1 req/s).
 */
import { z } from 'zod';

export const PLAYERS_SQUADS_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata players P54 ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const PLAYERS_SQUADS_MIN_INTERVAL_MS = 1000; // 1 req/s (regra do Operador)

/** Ocupações aceitas: futebolista (Q11513337) OU treinador de futebol (Q1920462). */
export const OCCUPATION_QIDS = ['Q11513337', 'Q1920462'] as const;

/** Gênero Wikidata → valor do acervo. */
const GENDER_MAP: Record<string, 'men' | 'women'> = {
  Q6581097: 'men',
  Q6581072: 'women',
};

/** P413 (rótulo EN) → posição do acervo. Desconhecida ⇒ null (nunca inventar). */
export function positionFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes('goalkeeper')) return 'GOALKEEPER';
  if (l.includes('defender') || l.includes('centre-back') || l.includes('fullback'))
    return 'DEFENDER';
  if (l.includes('midfielder')) return 'MIDFIELDER';
  if (l.includes('forward') || l.includes('striker') || l.includes('winger')) return 'FORWARD';
  return null;
}

// ---------------------------------------------------------------------------
// SPARQL
// ---------------------------------------------------------------------------

export interface BuildPlayersSquadsQueryOptions {
  clubQids: string[];
  limit?: number;
  offset?: number;
}

/**
 * Jogadores (futebolista OU treinador) com P54 apontando para os clubes do
 * VALUES. Rótulo em pt>en>es; P569/P27(+P297 ISO)/P21/P413 opcionais;
 * P580/P582 qualificam o vínculo.
 */
export function buildPlayersSquadsQuery(opts: BuildPlayersSquadsQueryOptions): string {
  const { clubQids, limit = 500, offset = 0 } = opts;
  const values = clubQids.map((q) => 'wd:' + q).join(' ');
  return `SELECT DISTINCT ?player ?label ?labelLang ?birth ?cc ?genderQ ?posLabel ?club ?start ?end WHERE {
  VALUES ?club { ${values} }
  ?player p:P54 ?stmt .
  ?stmt ps:P54 ?club .
  OPTIONAL { ?stmt pq:P580 ?start . }
  OPTIONAL { ?stmt pq:P582 ?end . }
  ?player wdt:P106 ?occ .
  FILTER(?occ IN (wd:Q11513337, wd:Q1920462))
  OPTIONAL { ?player wdt:P569 ?birth . }
  OPTIONAL {
    ?player wdt:P27 ?country .
    ?country wdt:P297 ?cc .
  }
  OPTIONAL { ?player wdt:P21 ?genderQ . }
  OPTIONAL {
    ?player wdt:P413 ?pos .
    ?pos rdfs:label ?posLabel .
    FILTER(LANG(?posLabel) = 'en')
  }
  ?player rdfs:label ?label .
  FILTER(LANG(?label) IN ('pt', 'en', 'es'))
}
LIMIT ${limit} OFFSET ${offset}`;
}

// ---------------------------------------------------------------------------
// Parse (Zod em todo payload externo)
// ---------------------------------------------------------------------------

interface BindingMap {
  [k: string]: { type?: string; value?: string } | undefined;
}

const rawRows = z
  .object({
    results: z
      .object({
        bindings: z.array(z.record(z.string(), z.unknown()) as z.ZodType<BindingMap>).optional(),
      })
      .optional(),
  })
  .passthrough();

function qidFromUri(uri: string | undefined): string | null {
  const last = uri?.trim().split('/').pop();
  return last && /^Q\d+$/.test(last) ? last : null;
}
function yearFromIso(value: string | undefined): number | null {
  const m = /^(\d{4})-/.exec(value ?? '');
  if (!m) return null;
  const y = Number.parseInt(m[1], 10);
  return Number.isInteger(y) ? y : null;
}

/** Linha crua validada (1 binding SPARQL). */
const RawPlayerRow = z.object({
  player: z.string(),
  label: z.string().optional(),
  labelLang: z.string().optional(),
  birth: z.string().optional(),
  cc: z.string().optional(),
  genderQ: z.string().optional(),
  posLabel: z.string().optional(),
  club: z.string(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export interface PlayerTeamLink {
  clubQid: string;
  startYear: number | null;
  endYear: number | null;
}

export interface PlayerSquad {
  qid: string;
  name: string;
  birthDate: string | null; // YYYY-MM-DD
  countryCode: string | null; // ISO 3166-1 alpha-2 (P297)
  gender: 'men' | 'women' | null;
  position: string | null; // GOALKEEPER|DEFENDER|MIDFIELDER|FORWARD|null
  teams: PlayerTeamLink[];
}

/**
 * Agrupa bindings por jogador (dedup de rótulo multi-idioma: pt > en > es >
 * qualquer) e destila os vínculos P54 válidos. Linhas inválidas são descartadas.
 */
export function parsePlayersSquadsResponse(json: unknown): PlayerSquad[] {
  const parsed = rawRows.safeParse(json);
  if (!parsed.success) return [];
  const bindings = (parsed.data.results?.bindings ?? []) as BindingMap[];

  interface Acc {
    name: string | null;
    nameRank: number;
    birth: string | null;
    cc: string | null;
    gender: 'men' | 'women' | null;
    position: string | null;
    teams: Map<string, PlayerTeamLink>;
  }
  const langRank = (l?: string): number => (l === 'pt' ? 3 : l === 'en' ? 2 : l === 'es' ? 1 : 0);
  const acc = new Map<string, Acc>();

  for (const b of bindings) {
    const row = RawPlayerRow.safeParse({
      player: b.player?.value ?? '',
      label: b.label?.value,
      labelLang:
        b.label && 'xml:lang' in (b.label as object)
          ? (b.label as unknown as { 'xml:lang'?: string })['xml:lang']
          : b.labelLang,
      birth: b.birth?.value,
      cc: b.cc?.value,
      genderQ: qidFromUri(b.genderQ?.value) ?? b.genderQ?.value?.split('/').pop(),
      posLabel: b.posLabel?.value,
      club: b.club?.value ?? '',
      start: b.start?.value,
      end: b.end?.value,
    });
    if (!row.success) continue;
    const r = row.data;
    const playerQid = qidFromUri(r.player);
    const clubQid = qidFromUri(r.club);
    if (!playerQid || !clubQid) continue;

    const a =
      acc.get(playerQid) ??
      ({
        name: null,
        nameRank: -1,
        birth: null,
        cc: null,
        gender: null,
        position: null,
        teams: new Map(),
      } as Acc);
    // Rótulo: melhor idioma vence (pt=3 > en=2 > es=1 > outro=0)
    const rank = langRank(r.labelLang);
    if (r.label && rank > a.nameRank) {
      a.name = r.label;
      a.nameRank = rank;
    }
    if (r.birth && !a.birth) a.birth = r.birth.slice(0, 10);
    if (r.cc && !a.cc) a.cc = r.cc.toUpperCase();
    if (r.genderQ && !a.gender) a.gender = GENDER_MAP[r.genderQ] ?? null;
    if (r.posLabel && !a.position) a.position = positionFromLabel(r.posLabel);
    // Vínculo: ano de início OU fim (ambos ausentes ⇒ link sem ano)
    const startYear = yearFromIso(r.start);
    const endYear = yearFromIso(r.end);
    const teamKey = clubQid;
    const prev = a.teams.get(teamKey);
    const link: PlayerTeamLink = {
      clubQid,
      startYear: startYear ?? prev?.startYear ?? null,
      endYear: endYear ?? prev?.endYear ?? null,
    };
    a.teams.set(teamKey, link);
    acc.set(playerQid, a);
  }

  const out: PlayerSquad[] = [];
  for (const [qid, a] of acc) {
    if (!a.name) continue; // sem rótulo humano — R4: dado sem label não entra
    out.push({
      qid,
      name: a.name,
      birthDate: a.birth,
      countryCode: a.cc,
      gender: a.gender,
      position: a.position,
      teams: [...a.teams.values()],
    });
  }
  return out.sort((x, y) => x.qid.localeCompare(y.qid));
}

// ---------------------------------------------------------------------------
// Fetch paginado, concorrência 1, intervalo mínimo de 1s entre páginas
// ---------------------------------------------------------------------------

export interface FetchPlayersSquadsOptions {
  endpoint?: string;
  userAgent?: string;
  clubQids: string[];
  limit?: number;
  maxPages?: number;
  fetchImpl?: typeof globalThis.fetch;
  sleep?: (ms: number) => Promise<void>;
  minIntervalMs?: number;
}

export async function fetchPlayersSquads(opts: FetchPlayersSquadsOptions): Promise<PlayerSquad[]> {
  const {
    endpoint = 'https://query.wikidata.org/sparql',
    userAgent = PLAYERS_SQUADS_USER_AGENT,
    clubQids,
    limit = 500,
    maxPages = 1,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    minIntervalMs = PLAYERS_SQUADS_MIN_INTERVAL_MS,
  } = opts;

  const all: PlayerSquad[] = [];
  for (let page = 0; page < maxPages; page++) {
    const query = buildPlayersSquadsQuery({ clubQids, limit, offset: page * limit });
    const url = `${endpoint}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetchImpl(url, {
      headers: { 'user-agent': userAgent, Accept: 'application/sparql-results+json' },
    });
    if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`);
    const pagePlayers = parsePlayersSquadsResponse(await res.json());
    all.push(...pagePlayers);
    if (pagePlayers.length === 0 || pagePlayers.length < limit) break;
    await sleep(minIntervalMs);
  }
  return all;
}
