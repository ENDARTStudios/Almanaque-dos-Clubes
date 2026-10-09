/**
 * T502 — connector genérico de MÍDIA Wikidata (logo P154, foto P18, estádio
 * P115→P625/P1083/P18, cores) para os enrich scripts W1/W2/W3.
 *
 * wbgetentities em lotes de 50 (1 req/s) — mesmo padrão T034/T499.
 * URLs de imagem: endpoint oficial Special:FilePath do Commons (nunca URL
 * inventada). Claims extraídos de datavalue.value (objeto com .id ou .time
 * ou string) conforme o tipo da propriedade.
 */
import { z } from 'zod';

export const MEDIA_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata media enrich; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

export interface ClaimSnak {
  mainsnak?: { datavalue?: { value?: unknown } };
}

const entityShape = z
  .object({
    entities: z.record(
      z.string(),
      z.object({
        labels: z
          .record(z.string(), z.object({ language: z.string(), value: z.string() }))
          .optional(),
        claims: z.record(z.string(), z.array(z.custom<ClaimSnak>()).optional()).optional(),
      }),
    ),
  })
  .passthrough();

export type EntityShape = NonNullable<z.infer<typeof entityShape>['entities']>[string];

export function qidFromValue(v: unknown): string | null {
  if (v == null || typeof v !== 'object') return null;
  const id = (v as { id?: unknown }).id;
  return typeof id === 'string' && /^Q\d+$/.test(id) ? id : null;
}

/** Extrai valores de uma claim: .id para entidades, .time para datas, string puro para strings. */
export function claimScalar(entity: EntityShape, pid: string): string | null {
  const v = (entity.claims?.[pid] ?? [])[0]?.mainsnak?.datavalue?.value;
  if (v == null) return null;
  if (typeof v === 'object') {
    const o = v as { id?: unknown; time?: unknown };
    if (typeof o.id === 'string') return o.id;
    if (typeof o.time === 'string') return o.time.replace(/^\+/, '').slice(0, 10);
    return null;
  }
  return String(v);
}

export function claimAll(entity: EntityShape, pid: string): string[] {
  return (entity.claims?.[pid] ?? [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v): v is NonNullable<typeof v> => v != null)
    .map((v) => {
      if (typeof v === 'object') {
        const o = v as { id?: unknown; time?: unknown };
        if (typeof o.id === 'string') return o.id;
        if (typeof o.time === 'string') return o.time.replace(/^\+/, '').slice(0, 10);
      }
      return String(v);
    });
}

/** Rótulo com precedência pt > en > es > qualquer. */
export function bestLabel(entity: EntityShape): string | null {
  let name: string | null = null;
  let rank = -1;
  for (const [lang, l] of Object.entries(entity.labels ?? {})) {
    const r =
      lang === 'pt-br' || lang === 'pt'
        ? 3
        : lang === 'en' || lang === 'en-us'
          ? 2
          : lang === 'es'
            ? 1
            : 0;
    if (r > rank) {
      name = l.value;
      rank = r;
    }
  }
  return name;
}

/** URL oficial do Commons para um nome de arquivo (nunca inventado). */
export function commonsFilePath(filename: string, width?: number): string {
  const clean = filename.replace(/^./, (c) => c.toUpperCase()).replace(/\s/g, '_');
  const base = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}`;
  return width ? `${base}?width=${width}` : base;
}

/** Lote de wbgetentities: Map<qid, EntityShape normalizado>. */
export async function fetchEntities(
  qids: string[],
  opts: {
    userAgent?: string;
    fetchImpl?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
    minIntervalMs?: number;
    batchSize?: number;
  } = {},
): Promise<Map<string, EntityShape>> {
  const {
    userAgent = MEDIA_USER_AGENT,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    minIntervalMs = 1000,
    batchSize = 50,
  } = opts;
  const out = new Map<string, EntityShape>();
  for (let i = 0; i < qids.length; i += batchSize) {
    const chunk = qids.slice(i, i + batchSize);
    const url = `${WIKIDATA_API}?action=wbgetentities&ids=${chunk.join('|')}&format=json&props=labels|claims`;
    const res = await fetchImpl(url, { headers: { 'user-agent': userAgent } });
    if (!res.ok) throw new Error(`wbgetentities HTTP ${res.status}`);
    const parsed = entityShape.safeParse(await res.json());
    if (!parsed.success) throw new Error('wbgetentities payload inválido');
    for (const [qid, e] of Object.entries(parsed.data.entities ?? {})) {
      out.set(qid, e);
    }
    if (i + batchSize < qids.length) await sleep(minIntervalMs);
  }
  return out;
}

/** SPARQL com retry 3× (backoff 2/4s). */
export async function sparql(
  query: string,
  opts: {
    userAgent?: string;
    fetchImpl?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<unknown> {
  const {
    userAgent = MEDIA_USER_AGENT,
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)),
  } = opts;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { 'user-agent': userAgent, Accept: 'application/sparql-results+json' },
      });
      if (res.ok) return await res.json();
    } catch (err) {
      if (attempt === 2) throw err;
    }
    if (attempt < 2) await sleep(2000 * 2 ** attempt);
  }
  throw new Error('SPARQL falhou após retries');
}

/** Extrai bindings como pares qid→valor. */
export function parseBindings(json: unknown): Array<Record<string, string>> {
  const b =
    (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } })?.results
      ?.bindings ?? [];
  return b.map((row) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) if (v?.value != null) o[k] = v.value;
    return o;
  });
}
