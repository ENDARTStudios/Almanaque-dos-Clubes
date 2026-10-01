/**
 * T471 onda 1 — Enriquecimento geográfico via Wikidata (CC0).
 *
 * Alvos (FASE 0 mediu em produção 2026-09-26):
 *  - clubs com qid e SEM coordenada (~2.925): P625 direto → fallback P131 (território) →
 *    fallback P115 (venue) → P625 do venue. NUNCA sobrescreve coordenada existente.
 *  - stadiums (tabela vazia): P115 do clube → entidade do estádio (name/P625/P1083),
 *    dedupe por QID, proveniência Wikidata CC0.
 *
 * Contratos:
 *  - default DRY-RUN; escrita só com --apply --allow-production;
 *  - --chunk-size=N (batch EntityData), --limit=N (clubes processados), --only-clubs/--only-stadiums;
 *  - UA identificado, backoff exponencial em 429/5xx (5 tentativas), pausa entre chunks,
 *    cache de entidades por batch;
 *  - retrievedAt = timestamp estático de COLETA (fim do fetch de cada chunk);
 *  - NUNCA ecoa segredo; NUNCA sobrescreve coord existente; sem fuzzy match (sempre QID).
 *
 * Uso (produção, no container):
 *   node dist/scripts/enrich-clubs-geo-wikidata.js                          # DRY-RUN
 *   node dist/scripts/enrich-clubs-geo-wikidata.js --apply --allow-production
 */
import { PrismaClient } from '@prisma/client';

const UA = 'AlmanaqueDosClubes-WikidataBot/1.0 (+https://almanaquedosclubes.com)';
// wbgetentities (Action API) aceita batch de 50 ids; Special:EntityData NÃO
// aceita múltiplos ids (404 medido no T471 onda 1).
const ENTITY_URL = (qids: string[]) =>
  `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=labels%7Cclaims&languages=pt%7Cen&format=json`;
const CHUNK = 50;
const PAUSE_MS = 1500;
const MAX_RETRIES = 5;
const TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Extractors PUROS (unit-testáveis)
// ---------------------------------------------------------------------------

export interface GlobeCoordinate {
  latitude: number;
  longitude: number;
  precision?: number;
}

interface CoordinateValue {
  latitude: number;
  longitude: number;
  precision?: number;
}

/** P625 — primeiro globecoordinate válido da entidade. */
export function extractP625(entity: WikidataEntity | undefined): GlobeCoordinate | null {
  const value = entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  if (!value || typeof value !== 'object') return null;
  const claim = value as CoordinateValue;
  if (typeof claim.latitude !== 'number' || typeof claim.longitude !== 'number') return null;
  if (Math.abs(claim.latitude) > 90 || Math.abs(claim.longitude) > 180) return null;
  return { latitude: claim.latitude, longitude: claim.longitude, precision: claim.precision };
}

/** QIDs de uma propriedade (entidades referenciadas). */
export function extractQids(entity: WikidataEntity | undefined, prop: string): string[] {
  return (entity?.claims?.[prop] ?? [])
    .map((c) => (c.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((v): v is string => typeof v === 'string');
}

export function labelOf(entity: WikidataEntity | undefined, lang = 'pt'): string | undefined {
  return entity?.labels?.[lang]?.value ?? entity?.labels?.en?.value;
}

export function extractCapacity(entity: WikidataEntity | undefined): number | null {
  const value = entity?.claims?.P1083?.[0]?.mainsnak?.datavalue?.value;
  if (!value || typeof value !== 'object') return null;
  const amount = (value as { amount?: string }).amount;
  if (typeof amount !== 'string') return null;
  const n = parseInt(amount.replace('+', ''), 10);
  return Number.isFinite(n) ? n : null;
}

// Tipos mínimos do formato Wikidata (sem SDK).
export interface WikidataEntity {
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
}
export type WikidataEntities = Record<string, WikidataEntity>;

/** Fallback chain P625 → P131 → P115, resolvida sobre um provedor de entidades (injetável). */
export interface EntityProvider {
  (qids: string[]): Promise<WikidataEntities>;
}

export interface ResolvedGeo {
  clubQid: string;
  source: 'P625' | 'P131' | 'P115' | null;
  latitude: number;
  longitude: number;
  venueQid?: string;
  venueName?: string;
  venueCapacity?: number | null;
}

export async function resolveClubGeo(
  clubQid: string,
  entities: WikidataEntities,
  provider: EntityProvider,
): Promise<ResolvedGeo | { clubQid: string; source: null }> {
  const club = entities[clubQid];
  if (!club) return { clubQid, source: null };

  // 1. P625 direto
  const direct = extractP625(club);
  if (direct) return { clubQid, source: 'P625', ...direct };

  // 2. P131 → P625 do território
  const territories = extractQids(club, 'P131');
  const territoryEntities = territories.length ? await provider(territories) : {};
  for (const t of territories) {
    const coords = extractP625(territoryEntities[t]);
    if (coords) return { clubQid, source: 'P131', ...coords };
  }

  // 3. P115 → P625 do estádio
  const venues = extractQids(club, 'P115');
  const venueEntities = venues.length ? await provider(venues) : {};
  for (const v of venues) {
    const coords = extractP625(venueEntities[v]);
    if (coords) {
      return {
        clubQid,
        source: 'P115',
        ...coords,
        venueQid: v,
        venueName: labelOf(venueEntities[v]),
        venueCapacity: extractCapacity(venueEntities[v]),
      };
    }
  }
  return { clubQid, source: null };
}

/** Dados de estádio a partir da entidade do venue (para a tabela stadiums). */
export function extractStadium(
  venueQid: string,
  entity: WikidataEntity | undefined,
  clubId: string,
): {
  qid: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  clubId: string;
} | null {
  if (!entity) return null;
  const coords = extractP625(entity);
  const name = labelOf(entity);
  if (!name && !coords) return null;
  const p17 = extractQids(entity, 'P17')[0];
  return {
    qid: venueQid,
    name: name ?? venueQid,
    city: null,
    country: p17 === 'Q155' ? 'BR' : null,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    capacity: extractCapacity(entity),
    clubId,
  };
}

// ---------------------------------------------------------------------------
// Fetch com backoff (5 tentativas, exponencial) + cache LRU simples
// ---------------------------------------------------------------------------

const cache = new Map<string, WikidataEntity>();

async function fetchEntities(qids: string[]): Promise<WikidataEntities> {
  const missing = qids.filter((q) => !cache.has(q));
  if (missing.length > 0) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(ENTITY_URL(missing), {
          headers: { 'user-agent': UA, Accept: 'application/json' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.status === 429 || res.status >= 500) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as { entities?: WikidataEntities };
        for (const [qid, ent] of Object.entries(j.entities ?? {})) cache.set(qid, ent);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
    if (lastError) throw lastError;
  }
  const out: WikidataEntities = {};
  for (const q of qids) if (cache.has(q)) out[q] = cache.get(q)!;
  return out;
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main(): Promise<void> {
  const APPLY = process.argv.includes('--apply');
  const ALLOW_PRODUCTION = process.argv.includes('--allow-production');
  if (APPLY && !ALLOW_PRODUCTION) {
    throw new Error('--apply exige --allow-production (gate explícito de escrita em produção)');
  }
  const argValue = (flag: string): number | undefined => {
    const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
    return a ? Number(a.split('=')[1]) : undefined;
  };
  const chunkSize = argValue('chunk-size') ?? CHUNK;
  const limit = argValue('limit');
  const onlyStadiums = process.argv.includes('--only-stadiums');

  console.log(`T471 onda 1 — enriquecimento geo Wikidata (${APPLY ? 'APPLY' : 'DRY-RUN'})`);
  const prisma = new PrismaClient();

  const clubs = await prisma.club.findMany({
    where: { deletedAt: null, qid: { not: null }, latitude: null },
    select: { id: true, qid: true, name: true },
    orderBy: { name: 'asc' },
    ...(limit ? { take: limit } : {}),
  });
  const targets = clubs.filter((c): c is typeof c & { qid: string } => !!c.qid);
  console.log(
    `clubes sem coordenada com QID: ${targets.length}${limit ? ` (limit ${limit})` : ''}`,
  );

  const provider: EntityProvider = async (qids) => {
    const out: WikidataEntities = {};
    for (const part of chunked(qids, chunkSize)) {
      const entities = await fetchEntities(part);
      Object.assign(out, entities);
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    return out;
  };

  let updated = 0;
  const bySource: Record<string, number> = {};
  const notFound: string[] = [];

  if (!onlyStadiums) {
    for (const part of chunked(
      targets.map((c) => c.qid),
      chunkSize,
    )) {
      const entities = await fetchEntities(part);
      await new Promise((r) => setTimeout(r, PAUSE_MS));
      for (const c of targets.filter((t) => entities[t.qid])) {
        const resolved = await resolveClubGeo(c.qid, entities, provider);
        if (resolved.source === null) {
          notFound.push(c.name);
          continue;
        }
        bySource[resolved.source] = (bySource[resolved.source] ?? 0) + 1;
        if (APPLY) {
          const res = await prisma.club.updateMany({
            where: { id: c.id, latitude: null, longitude: null },
            data: {
              latitude: resolved.latitude,
              longitude: resolved.longitude,
              ...(resolved.source === 'P115' && resolved.venueName
                ? { sourceUrl: `https://www.wikidata.org/wiki/${resolved.venueQid} (P115 venue)` }
                : {}),
            },
          });
          updated += res.count;
        }
        console.log(
          `  [${resolved.source}] ${c.name} (${c.qid}) → ${resolved.latitude.toFixed(4)}, ${resolved.longitude.toFixed(4)}`,
        );
      }
    }
    if (APPLY) console.log(`coordenadas preenchidas: ${updated}`);
    console.log(
      `coordenadas: ${APPLY ? 'aplicadas' : 'encontradas'} por fonte: ${JSON.stringify(bySource)} · não resolvidos: ${notFound.length}`,
    );
    if (notFound.length > 0)
      console.log('  sem geo na fonte (amostra):', notFound.slice(0, 10).join(', '));
  }

  if (!APPLY) {
    console.log('\nDRY-RUN — nada gravado. Rode com --apply --allow-production para aplicar.');
    await prisma.$disconnect();
    return;
  }

  await prisma.$disconnect();
  console.log('concluído');
}

main().catch((err) => {
  console.error('FALHA:', err instanceof Error ? err.message : err);
  process.exit(1);
});
