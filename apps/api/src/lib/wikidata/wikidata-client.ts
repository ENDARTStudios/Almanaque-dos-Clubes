/**
 * WS-D M1a — Cliente Wikidata (CC0) com backoff, timeout, retry e cache em memória.
 * PURO de domínio: só I/O HTTP. `fetchEntity` retorna null em 404 e lança em 5xx após os retries.
 */
export const WIKIDATA_USER_AGENT =
  'AlmanaqueDosClubes-WikidataBot/1.0 (+https://almanaquedosclubes.com; endart.studios@gmail.com)';

export interface WikidataDatavalue {
  value: unknown;
}
export interface WikidataClaim {
  mainsnak?: { datavalue?: { value?: unknown } };
}
export interface WikidataEntity {
  id: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
  claims?: Record<string, WikidataClaim[]>;
}

export interface FetchEntityOptions {
  /** tentativas totais (default 5) */
  maxRetries?: number;
  /** timeout por request em ms (default 30_000) */
  timeoutMs?: number;
  /** base do backoff em ms (default 1000 → 1s,2s,4s,8s,16s) */
  backoffBaseMs?: number;
  /** pausa artificial entre requests (rate limit) */
  sleep?: (ms: number) => Promise<void>;
}

const cache = new Map<string, { value: WikidataEntity | null; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

export function __clearWikidataCache(): void {
  cache.clear();
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Busca em lote (wbgetentities, 50/req) com cache e backoff. Retorna mapa qid→entidade|null. */
export async function fetchEntities(
  qids: string[],
  opts: FetchEntityOptions = {},
): Promise<Map<string, WikidataEntity | null>> {
  const out = new Map<string, WikidataEntity | null>();
  const unique = [...new Set(qids.filter((q) => /^Q\d+$/.test(q)))];
  const maxRetries = opts.maxRetries ?? 5;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const backoffBaseMs = opts.backoffBaseMs ?? 1000;
  const sleep = opts.sleep ?? defaultSleep;

  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const toFetch: string[] = [];
    for (const q of batch) {
      const hit = cache.get(q);
      if (hit && hit.expires > Date.now()) out.set(q, hit.value);
      else toFetch.push(q);
    }
    if (!toFetch.length) continue;

    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${toFetch.join('|')}&props=labels|aliases|claims&languages=pt|en&format=json&origin=*`;
    let done = false;
    for (let attempt = 0; attempt < maxRetries && !done; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': WIKIDATA_USER_AGENT, Accept: 'application/json' },
          signal: controller.signal,
        });
        if (res.status === 429 || res.status >= 500) {
          if (attempt === maxRetries - 1) throw new Error(`HTTP ${res.status} (batch)`);
          await sleep(backoffBaseMs * 2 ** attempt);
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status} (batch)`);
        const json = (await res.json()) as { entities?: Record<string, WikidataEntity> };
        for (const q of toFetch) {
          const e = json.entities?.[q] ?? null;
          cache.set(q, { value: e, expires: Date.now() + CACHE_TTL_MS });
          out.set(q, e);
        }
        done = true;
      } catch (err) {
        if (attempt === maxRetries - 1) throw err;
        await sleep(backoffBaseMs * 2 ** attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    await sleep(100); // respeito ao rate limit entre lotes
  }
  return out;
}

export async function fetchEntity(
  qid: string,
  opts: FetchEntityOptions = {},
): Promise<WikidataEntity | null> {
  if (!/^Q\d+$/.test(qid)) throw new Error(`qid inválido: ${qid}`);
  const now = Date.now();
  const hit = cache.get(qid);
  if (hit && hit.expires > now) return hit.value;

  const maxRetries = opts.maxRetries ?? 5;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const backoffBaseMs = opts.backoffBaseMs ?? 1000;
  const sleep = opts.sleep ?? defaultSleep;
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': WIKIDATA_USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.status === 404) {
        cache.set(qid, { value: null, expires: Date.now() + CACHE_TTL_MS });
        return null;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt === maxRetries - 1)
          throw new Error(`HTTP ${res.status} após ${maxRetries} tentativas (${qid})`);
        await sleep(backoffBaseMs * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} (${qid})`);
      const json = (await res.json()) as { entities?: Record<string, WikidataEntity> };
      const entity = json.entities?.[qid] ?? null;
      cache.set(qid, { value: entity, expires: Date.now() + CACHE_TTL_MS });
      return entity;
    } catch (err) {
      const isAbort = (err as Error)?.name === 'AbortError';
      if (attempt === maxRetries - 1) throw err;
      await sleep(backoffBaseMs * 2 ** attempt + (isAbort ? 0 : 0));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
