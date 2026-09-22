/**
 * T466 — Conector geográfico (Wikidata): hierarquia Continent → Country → State → City.
 *
 * Para os clubes já ingeridos (`qid` presente), resolve:
 *   - País:    P17 → QID + ISO 3166-1 alpha-2 (P297) + continente (P30)
 *   - Cidade:  P131 (entidade administrativa onde o clube está) → QID + label (+ P625)
 *   - Estado:  P131 da cidade (subdivisão pai) quando possui ISO 3166-2 (P300)
 *
 * Fonte: Wikidata (CC0). Chaves de dedup estáveis:
 *   countries.iso2 · states.code (ISO 3166-2) · cities.qid.
 *
 * Funções puras (sem I/O) — o I/O (fetch/Prisma) fica no script `ingest-geo-wikidata.ts`.
 * TODO payload externo é validado por Zod (dado externo é hostil — STRIDE T).
 */
import { z } from 'zod';

/** Códigos de continente (2 letras) mapeados a partir do QID do Wikidata (P30). */
export const CONTINENT_QID_TO_CODE: Record<string, string> = {
  Q15: 'AF', // África
  Q51: 'AN', // Antártida
  Q48: 'AS', // Ásia
  Q46: 'EU', // Europa
  Q49: 'NA', // América do Norte
  Q55643: 'OC', // Oceania
  Q18: 'SA', // América do Sul
};

export interface GeoRow {
  clubQid: string;
  countryQid: string;
  countryIso2: string;
  countryName: string;
  continent: string | null;
  adminQid: string | null;
  adminName: string | null;
  stateQid: string | null;
  stateName: string | null;
  stateCode: string | null;
  cityPoint: { lat: number; lng: number } | null;
  clubPoint: { lat: number; lng: number } | null;
}

const GeoRowSchema = z.object({
  clubQid: z.string().regex(/^Q\d+$/),
  countryQid: z.string().regex(/^Q\d+$/),
  countryIso2: z.string().length(2),
  countryName: z.string().min(1),
  continent: z.string().length(2).nullable(),
  adminQid: z
    .string()
    .regex(/^Q\d+$/)
    .nullable(),
  adminName: z.string().min(1).nullable(),
  stateQid: z
    .string()
    .regex(/^Q\d+$/)
    .nullable(),
  stateName: z.string().min(1).nullable(),
  stateCode: z.string().min(1).nullable(),
  cityPoint: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  clubPoint: z.object({ lat: z.number(), lng: z.number() }).nullable(),
});

interface SparqlBinding {
  [key: string]: { value: string; type?: string } | undefined;
}
interface SparqlResponse {
  results?: { bindings?: SparqlBinding[] };
}

export function wikidataItemUrl(qid: string): string {
  return `https://www.wikidata.org/wiki/${qid}`;
}

/** Extrai o Q-id de uma URI do Wikidata (…/entity/Q123) — null se não casar. */
export function qidFromUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const m = /\/entity\/(Q\d+)$/.exec(uri);
  return m ? m[1] : null;
}

/** Mapeia o QID do continente (P30) para o código de 2 letras; null se desconhecido. */
export function continentCode(uri: string | undefined): string | null {
  const qid = qidFromUri(uri);
  if (!qid) return null;
  return CONTINENT_QID_TO_CODE[qid] ?? null;
}

/**
 * Converte o literal WKT do Wikidata (`Point(lon lat)`, P625) em `{ lat, lng }`.
 * Retorna null quando ausente/malformado ou fora das faixas válidas.
 */
export function parsePoint(wkt: string | undefined): { lat: number; lng: number } | null {
  if (!wkt) return null;
  const m = /^Point\(([-0-9.]+) ([-0-9.]+)\)$/.exec(wkt.trim());
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** SPARQL paginado por `VALUES ?club { … }` (uma consulta por lote). */
export function buildGeoQuery(clubQids: string[]): string {
  const values = clubQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT DISTINCT ?club ?country ?countryLabel ?iso ?continentQid ?admin ?adminLabel ?parent ?parentLabel ?parentIso ?adminPoint ?clubPoint WHERE {
  VALUES ?club { ${values} }
  ?club wdt:P17 ?country .
  ?country wdt:P297 ?iso .
  OPTIONAL { ?country wdt:P30 ?continentQid . }
  OPTIONAL { ?club wdt:P625 ?clubPoint . }
  OPTIONAL {
    ?club wdt:P131 ?admin .
    OPTIONAL { ?admin wdt:P625 ?adminPoint . }
    OPTIONAL { ?admin wdt:P131 ?parent . OPTIONAL { ?parent wdt:P300 ?parentIso . } }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,pt,es". }
}`.trim();
}

/**
 * Normaliza os bindings do SPARQL para 1 linha por clube (dedup determinístico):
 * pega o 1º admin (cidade) e o 1º parent com ISO 3166-2 (estado). Linhas sem país
 * ISO-2 válido são descartadas. Zod valida cada linha (payload externo).
 */
export function parseGeoBindings(json: unknown): GeoRow[] {
  const bindings = (json as SparqlResponse | null)?.results?.bindings ?? [];
  const byClub = new Map<string, GeoRow>();

  for (const b of bindings) {
    const clubQid = qidFromUri(b.club?.value);
    const countryQid = qidFromUri(b.country?.value);
    const iso2 = (b.iso?.value ?? '').toUpperCase();
    if (!clubQid || !countryQid || iso2.length !== 2) continue;

    let row = byClub.get(clubQid);
    if (!row) {
      row = {
        clubQid,
        countryQid,
        countryIso2: iso2,
        countryName: b.countryLabel?.value ?? countryQid,
        continent: continentCode(b.continentQid?.value),
        adminQid: null,
        adminName: null,
        stateQid: null,
        stateName: null,
        stateCode: null,
        cityPoint: null,
        clubPoint: parsePoint(b.clubPoint?.value),
      };
      byClub.set(clubQid, row);
    }

    const adminQid = qidFromUri(b.admin?.value);
    if (adminQid && !row.adminQid) {
      row.adminQid = adminQid;
      row.adminName = b.adminLabel?.value ?? adminQid;
      row.cityPoint = parsePoint(b.adminPoint?.value);
    }

    const parentQid = qidFromUri(b.parent?.value);
    const parentIso = b.parentIso?.value;
    if (parentQid && parentIso && !row.stateQid) {
      row.stateQid = parentQid;
      row.stateName = b.parentLabel?.value ?? parentQid;
      row.stateCode = parentIso.toUpperCase();
    }
  }

  return [...byClub.values()].filter((r) => GeoRowSchema.safeParse(r).success);
}

export function validateGeoRow(row: unknown): GeoRow | null {
  const parsed = GeoRowSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

// -----------------------------------------------------------------------------
// Planejamento puro (rows → entidades deduplicadas + vínculos dos clubes)
// -----------------------------------------------------------------------------

export const GEO_DATASOURCE = 'wikidata-geo';

export interface CountryPlan {
  iso2: string;
  name: string;
  continent: string | null;
  qid: string;
}
export interface StatePlan {
  code: string;
  name: string;
  countryIso2: string;
  qid: string;
}
export interface CityPlan {
  qid: string;
  name: string;
  countryIso2: string;
  stateCode: string | null;
  lat: number | null;
  lng: number | null;
}
export interface ClubGeoLink {
  clubQid: string;
  countryIso2: string;
  stateCode: string | null;
  cityQid: string | null;
  latitude: number | null;
  longitude: number | null;
}
export interface GeoPlan {
  countries: CountryPlan[];
  states: StatePlan[];
  cities: CityPlan[];
  links: ClubGeoLink[];
}

/** Deduplica por chave estável (iso2 / code / qid) preservando a 1ª ocorrência. */
export function planGeo(rows: GeoRow[]): GeoPlan {
  const countries = new Map<string, CountryPlan>();
  const states = new Map<string, StatePlan>();
  const cities = new Map<string, CityPlan>();
  const links: ClubGeoLink[] = [];

  for (const r of rows) {
    if (!countries.has(r.countryIso2)) {
      countries.set(r.countryIso2, {
        iso2: r.countryIso2,
        name: r.countryName,
        continent: r.continent,
        qid: r.countryQid,
      });
    }
    if (r.stateCode && r.stateQid && !states.has(r.stateCode)) {
      states.set(r.stateCode, {
        code: r.stateCode,
        name: r.stateName ?? r.stateCode,
        countryIso2: r.countryIso2,
        qid: r.stateQid,
      });
    }
    if (r.adminQid && !cities.has(r.adminQid)) {
      cities.set(r.adminQid, {
        qid: r.adminQid,
        name: r.adminName ?? r.adminQid,
        countryIso2: r.countryIso2,
        stateCode: r.stateCode,
        lat: r.cityPoint?.lat ?? null,
        lng: r.cityPoint?.lng ?? null,
      });
    }
    links.push({
      clubQid: r.clubQid,
      countryIso2: r.countryIso2,
      stateCode: r.stateCode,
      cityQid: r.adminQid,
      latitude: r.clubPoint?.lat ?? null,
      longitude: r.clubPoint?.lng ?? null,
    });
  }

  return {
    countries: [...countries.values()],
    states: [...states.values()],
    cities: [...cities.values()],
    links,
  };
}

// -----------------------------------------------------------------------------
// Sincronização idempotente (repositório injetável — testável em memória)
// -----------------------------------------------------------------------------

export interface CountryCreateInput {
  iso2: string;
  name: string;
  continent: string | null;
  qid: string;
  importedFrom: string;
  importedAt: Date;
  sourceUrl: string;
}
export interface StateCreateInput {
  code: string;
  name: string;
  countryId: string;
  qid: string;
  importedFrom: string;
  importedAt: Date;
  sourceUrl: string;
}
export interface CityCreateInput {
  qid: string;
  name: string;
  countryId: string;
  stateId: string | null;
  latitude: number | null;
  longitude: number | null;
  importedFrom: string;
  importedAt: Date;
  sourceUrl: string;
}
export interface ClubGeoUpdate {
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  // Coordenadas P625 (opcionais: ausência na fonte NÃO sobrescreve o valor existente).
  latitude?: number;
  longitude?: number;
}

export interface GeoRepository {
  findCountryByIso2(
    iso2: string,
  ): Promise<{ id: string; name: string; continent: string | null; qid: string | null } | null>;
  createCountry(input: CountryCreateInput): Promise<{ id: string }>;
  updateCountry(iso2: string, input: CountryCreateInput): Promise<void>;
  findStateByCode(
    code: string,
  ): Promise<{ id: string; name: string; countryId: string; qid: string | null } | null>;
  createState(input: StateCreateInput): Promise<{ id: string }>;
  updateState(code: string, input: StateCreateInput): Promise<void>;
  findCityByQid(
    qid: string,
  ): Promise<{ id: string; name: string; countryId: string; stateId: string | null } | null>;
  createCity(input: CityCreateInput): Promise<{ id: string }>;
  updateCity(qid: string, input: CityCreateInput): Promise<void>;
  findClubByQid(qid: string): Promise<{
    id: string;
    countryId: string | null;
    stateId: string | null;
    cityId: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null>;
  updateClubGeo(clubId: string, update: ClubGeoUpdate): Promise<void>;
}

export interface EntityStats {
  created: number;
  updated: number;
  skipped: number;
}
export interface SyncStats {
  countries: EntityStats;
  states: EntityStats;
  cities: EntityStats;
  links: { linked: number; unchanged: number; missing: number };
}

/**
 * Aplica o plano de forma idempotente: só cria/atualiza quando há mudança;
 * re-run sem alteração ⇒ created=0, updated=0 (zero escrita).
 */
export async function syncGeo(repo: GeoRepository, plan: GeoPlan, now: Date): Promise<SyncStats> {
  const stats: SyncStats = {
    countries: { created: 0, updated: 0, skipped: 0 },
    states: { created: 0, updated: 0, skipped: 0 },
    cities: { created: 0, updated: 0, skipped: 0 },
    links: { linked: 0, unchanged: 0, missing: 0 },
  };

  const countryIdByIso2 = new Map<string, string>();
  for (const c of plan.countries) {
    const input: CountryCreateInput = {
      iso2: c.iso2,
      name: c.name,
      continent: c.continent,
      qid: c.qid,
      importedFrom: GEO_DATASOURCE,
      importedAt: now,
      sourceUrl: wikidataItemUrl(c.qid),
    };
    const existing = await repo.findCountryByIso2(c.iso2);
    if (!existing) {
      const created = await repo.createCountry(input);
      countryIdByIso2.set(c.iso2, created.id);
      stats.countries.created++;
    } else {
      countryIdByIso2.set(c.iso2, existing.id);
      if (
        existing.name !== c.name ||
        existing.continent !== c.continent ||
        existing.qid !== c.qid
      ) {
        await repo.updateCountry(c.iso2, input);
        stats.countries.updated++;
      } else {
        stats.countries.skipped++;
      }
    }
  }

  const stateIdByCode = new Map<string, string>();
  for (const s of plan.states) {
    const countryId = countryIdByIso2.get(s.countryIso2);
    if (!countryId) continue;
    const input: StateCreateInput = {
      code: s.code,
      name: s.name,
      countryId,
      qid: s.qid,
      importedFrom: GEO_DATASOURCE,
      importedAt: now,
      sourceUrl: wikidataItemUrl(s.qid),
    };
    const existing = await repo.findStateByCode(s.code);
    if (!existing) {
      const created = await repo.createState(input);
      stateIdByCode.set(s.code, created.id);
      stats.states.created++;
    } else {
      stateIdByCode.set(s.code, existing.id);
      if (existing.name !== s.name || existing.countryId !== countryId || existing.qid !== s.qid) {
        await repo.updateState(s.code, input);
        stats.states.updated++;
      } else {
        stats.states.skipped++;
      }
    }
  }

  const cityIdByQid = new Map<string, string>();
  for (const ct of plan.cities) {
    const countryId = countryIdByIso2.get(ct.countryIso2);
    if (!countryId) continue;
    const stateId = ct.stateCode ? (stateIdByCode.get(ct.stateCode) ?? null) : null;
    const input: CityCreateInput = {
      qid: ct.qid,
      name: ct.name,
      countryId,
      stateId,
      latitude: ct.lat,
      longitude: ct.lng,
      importedFrom: GEO_DATASOURCE,
      importedAt: now,
      sourceUrl: wikidataItemUrl(ct.qid),
    };
    const existing = await repo.findCityByQid(ct.qid);
    if (!existing) {
      const created = await repo.createCity(input);
      cityIdByQid.set(ct.qid, created.id);
      stats.cities.created++;
    } else {
      cityIdByQid.set(ct.qid, existing.id);
      if (
        existing.name !== ct.name ||
        existing.countryId !== countryId ||
        existing.stateId !== stateId
      ) {
        await repo.updateCity(ct.qid, input);
        stats.cities.updated++;
      } else {
        stats.cities.skipped++;
      }
    }
  }

  for (const link of plan.links) {
    const club = await repo.findClubByQid(link.clubQid);
    if (!club) {
      stats.links.missing++;
      continue;
    }
    const update: ClubGeoUpdate = {
      countryId: countryIdByIso2.get(link.countryIso2) ?? null,
      stateId: link.stateCode ? (stateIdByCode.get(link.stateCode) ?? null) : null,
      cityId: link.cityQid ? (cityIdByQid.get(link.cityQid) ?? null) : null,
    };
    // Coordenada P625: só grava quando a fonte tem valor (ausência NÃO apaga o existente).
    const hasCoords = link.latitude != null && link.longitude != null;
    if (hasCoords) {
      update.latitude = link.latitude as number;
      update.longitude = link.longitude as number;
    }
    const coordsSame =
      !hasCoords || (club.latitude === link.latitude && club.longitude === link.longitude);
    if (
      club.countryId === update.countryId &&
      club.stateId === update.stateId &&
      club.cityId === update.cityId &&
      coordsSame
    ) {
      stats.links.unchanged++;
      continue;
    }
    await repo.updateClubGeo(club.id, update);
    stats.links.linked++;
  }

  return stats;
}
