/**
 * T451 — job `wikidata-incremental` (fila data-refresh).
 *
 * Enriquecimento incremental de clubes ativos SEM coords, SEM city OU SEM títulos:
 * 1. seleciona batch (BATCH_SIZE, default 50) por query única (raw, order estável);
 * 2. busca entidades via wbgetentities (batch, UA identificado, backoff em 429/5xx);
 * 3. extrai P625 direto → P131 (território: coords + label como city) → P115 (venue coords);
 * 4. monta patch APENAS de campos nulos (zero overwrite — `buildPatch` puro);
 * 5. DRY-RUN por padrão: só loga `fields_updated`. Escrita real exige
 *    WIKIDATA_DRY_RUN=false (dupla guarda com ETL_SCHEDULER_ENABLED do scheduler).
 *
 * Fonte: Wikidata (CC0) — única fonte aprovada. Sem fuzzy match (sempre QID).
 */
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

export interface WikidataEntityClaims {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
  labels?: Record<string, { value: string }>;
}
export type WikidataEntities = Record<string, WikidataEntityClaims>;

export interface IncrementalCandidate {
  id: string;
  qid: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
}

export interface ClubPatch {
  clubId: string;
  qid: string;
  name: string;
  fields: { latitude?: number; longitude?: number; city?: string };
  source: 'P625' | 'P131' | 'P115' | null;
}

export interface IncrementalOutcome {
  dryRun: boolean;
  scanned: number;
  clubsWouldUpdate: number;
  clubsUpdated: number;
  errors: string[];
}

const UA_DEFAULT = 'AlmanaqueDosClubes-WikidataBot/1.0 (+https://almanaquedosclubes.com)';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

/** Seleção de candidatos: ativos com QID e (sem coord OU sem city OU sem título WON).
 * ORDER BY random(): clubes não-resolvíveis NUNCA saem da piscina (o job não cria
 * títulos nem coords que a fonte não tem) — qualquer ordem determinística re-varre
 * os mesmos primeiros para sempre (starving medido 2× no primeiro dia: por nome e
 * por prioridade geo). Amostra aleatória cobre o pool estocasticamente. */
export async function pickCandidates(batchSize: number): Promise<IncrementalCandidate[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      qid: string;
      name: string;
      latitude: number | null;
      longitude: number | null;
      city: string | null;
    }>
  >(
    `SELECT c.id, c.qid, c.name, c.latitude, c.longitude, c.city
     FROM clubs c
     WHERE c."deletedAt" IS NULL AND c.qid IS NOT NULL
       AND (
         c.latitude IS NULL OR c.city IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM knowledge_graph k
           WHERE k."sourceId" = c.id AND k."sourceType" = 'Club' AND k.relation = 'WON'
         )
       )
     ORDER BY random()
     LIMIT $1`,
    batchSize,
  );
  return rows;
}

/** Extrai globecoordinate válido (mesmo contrato do enrich T471). */
export function extractP625(
  entity: WikidataEntityClaims | undefined,
): { latitude: number; longitude: number } | null {
  const value = entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  if (!value || typeof value !== 'object') return null;
  const c = value as { latitude?: unknown; longitude?: unknown };
  if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return null;
  if (Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180) return null;
  return { latitude: c.latitude, longitude: c.longitude };
}

function firstQid(entity: WikidataEntityClaims | undefined, prop: string): string | null {
  const v = entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  if (!v || typeof v !== 'object') return null;
  const id = (v as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function labelOf(entity: WikidataEntityClaims | undefined): string | null {
  const l = entity?.labels;
  const pt = l?.pt?.value ?? l?.en?.value;
  return typeof pt === 'string' && pt.length > 0 ? pt : null;
}

/**
 * PURO — patch de campos NULOS a partir da entidade do clube e das entidades
 * auxiliares (território P131 / venue P115). Nunca sobrescreve valor existente.
 */
export function buildPatch(
  club: IncrementalCandidate,
  entity: WikidataEntityClaims | undefined,
  territory: WikidataEntityClaims | undefined,
  venue: WikidataEntityClaims | undefined,
): ClubPatch {
  const fields: ClubPatch['fields'] = {};
  let source: ClubPatch['source'] = null;

  if (club.latitude == null || club.longitude == null) {
    const direct = extractP625(entity);
    if (direct) {
      fields.latitude = direct.latitude;
      fields.longitude = direct.longitude;
      source = 'P625';
    } else {
      const territoryCoords = extractP625(territory);
      if (territoryCoords) {
        fields.latitude = territoryCoords.latitude;
        fields.longitude = territoryCoords.longitude;
        source = 'P131';
      } else {
        const venueCoords = extractP625(venue);
        if (venueCoords) {
          fields.latitude = venueCoords.latitude;
          fields.longitude = venueCoords.longitude;
          source = 'P115';
        }
      }
    }
  }
  if (club.city == null) {
    const territoryLabel = labelOf(territory);
    if (territoryLabel) {
      fields.city = territoryLabel;
      source = source ?? 'P131';
    }
  }
  return { clubId: club.id, qid: club.qid, name: club.name, fields, source };
}

const WBGETENTITIES_CHUNK = 50;
const PAUSE_MS = 1500;

/** Uma requisição wbgetentities com backoff exponencial (429/5xx/4xx transitório). */
async function fetchEntitiesOnce(qids: string[], userAgent: string): Promise<WikidataEntities> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=labels%7Cclaims&languages=pt%7Cen&format=json`;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as { entities?: WikidataEntities };
      return j.entities ?? {};
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Fetch com backoff — CHUNKA em 50 ids por requisição (wbgetentities aceita
 * batch de 50; URL >~4k chars estoura 414 — lição T471, pega no dry-run 1000).
 */
export async function fetchWikidataEntities(
  qids: string[],
  userAgent: string,
): Promise<WikidataEntities> {
  const out: WikidataEntities = {};
  for (let i = 0; i < qids.length; i += WBGETENTITIES_CHUNK) {
    const part = qids.slice(i, i + WBGETENTITIES_CHUNK);
    const entities = await fetchEntitiesOnce(part, userAgent);
    Object.assign(out, entities);
    if (i + WBGETENTITIES_CHUNK < qids.length) {
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }
  return out;
}

export interface IncrementalOptions {
  batchSize?: number;
  dryRun?: boolean;
  userAgent?: string;
  /** Provedor de entidades injetável (testes: mock, nunca API real). */
  provider?: (qids: string[]) => Promise<WikidataEntities>;
}

export async function runWikidataIncremental(
  opts: IncrementalOptions = {},
): Promise<IncrementalOutcome> {
  const batchSize = opts.batchSize ?? Number(process.env.BATCH_SIZE ?? '50');
  const dryRun = opts.dryRun ?? (process.env.WIKIDATA_DRY_RUN ?? 'true') !== 'false';
  const userAgent = opts.userAgent ?? process.env.WIKIDATA_USER_AGENT ?? UA_DEFAULT;
  const provider: (qids: string[]) => Promise<WikidataEntities> =
    opts.provider ?? ((qids: string[]) => fetchWikidataEntities(qids, userAgent));

  const candidates = await pickCandidates(batchSize);
  const outcome: IncrementalOutcome = {
    dryRun,
    scanned: candidates.length,
    clubsWouldUpdate: 0,
    clubsUpdated: 0,
    errors: [],
  };
  if (candidates.length === 0) {
    logger.info({ batchSize, dryRun }, 'wikidata-incremental: nenhum candidato no batch');
    return outcome;
  }

  // Entidades necessárias: clubes + P131/P115 referenciados.
  const clubEntities = await provider(candidates.map((c) => c.qid));
  const refQids = new Set<string>();
  for (const c of candidates) {
    const ent = clubEntities[c.qid];
    const p131 = firstQid(ent, 'P131');
    const p115 = firstQid(ent, 'P115');
    if (p131) refQids.add(p131);
    if (p115) refQids.add(p115);
  }
  const refEntities = refQids.size > 0 ? await provider([...refQids]) : {};

  for (const club of candidates) {
    try {
      const ent = clubEntities[club.qid];
      const p131 = firstQid(ent, 'P131');
      const p115 = firstQid(ent, 'P115');
      const patch = buildPatch(
        club,
        ent,
        p131 ? refEntities[p131] : undefined,
        p115 ? refEntities[p115] : undefined,
      );
      if (Object.keys(patch.fields).length === 0) continue;
      outcome.clubsWouldUpdate += 1;

      // Zero overwrite: o where re-verifica que cada campo segue nulo.
      if (!dryRun) {
        const res = await prisma.club.updateMany({
          where: {
            id: patch.clubId,
            ...(patch.fields.latitude != null ? { latitude: null } : {}),
            ...(patch.fields.city != null ? { city: null } : {}),
          },
          data: patch.fields,
        });
        if (res.count > 0) outcome.clubsUpdated += 1;
        logger.info(
          {
            clubId: patch.clubId,
            qid: patch.qid,
            fields_updated: Object.keys(patch.fields),
            source: patch.source,
          },
          'wikidata-incremental: clube atualizado',
        );
      } else {
        logger.info(
          {
            clubId: patch.clubId,
            qid: patch.qid,
            fields_updated: Object.keys(patch.fields),
            source: patch.source,
          },
          'wikidata-incremental: dry-run (nada gravado)',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      outcome.errors.push(`${club.qid}: ${msg}`);
      logger.error(
        { clubId: club.id, qid: club.qid, err: msg },
        'wikidata-incremental: erro no clube',
      );
    }
  }

  logger.info(
    {
      scanned: outcome.scanned,
      wouldUpdate: outcome.clubsWouldUpdate,
      updated: outcome.clubsUpdated,
      errors: outcome.errors.length,
      dryRun,
    },
    'wikidata-incremental concluído',
  );
  return outcome;
}
