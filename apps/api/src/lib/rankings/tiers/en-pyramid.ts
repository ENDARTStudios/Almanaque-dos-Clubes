/**
 * T449c-v1 — Pirâmide inglesa (piloto RSSSF England 2022/23) como metadado VERSIONADO.
 *
 * FONTE ÚNICA dos QIDs do piloto EN: o ingest (`ingest-rsssf-england-tables.ts`) importa
 * `EN_DIVISION_QID_BY_RSSSF_NAME` daqui — sem duplicação hardcoded sem referência.
 *
 * PURO: sem DB, sem rede, sem Prisma. `tsc` compila junto (não é asset JSON).
 */

export const EN_PYRAMID_TIER_VERSION = 't449c-v1-en-pyramid-2026-09-27';

export interface EnDivisionTier {
  /** QID canônico da competição (Wikidata). */
  competitionQid: string;
  /** Degrau na pirâmide nacional (1 = elite). */
  level: number;
  /** Nome público da divisão. */
  divisionLabel: string;
  /** Código de país do piloto (competitions.country). */
  country: 'GB';
  /** Proveniência do mapeamento. */
  source: 'rsssf-england-pilot';
}

/** Nome da divisão como aparece nas tabelas RSSSF → QID canônico (piloto EN). */
export const EN_DIVISION_QID_BY_RSSSF_NAME: Readonly<Record<string, string>> = {
  'Premier League': 'Q9448',
  Championship: 'Q19510',
  'Division 1': 'Q19565',
  'Division 2': 'Q48837',
  'National League': 'Q18504',
};

/** Camadas da pirâmide, do topo (level 1) para baixo. */
export const EN_PYRAMID_TIERS: readonly EnDivisionTier[] = [
  {
    competitionQid: 'Q9448',
    level: 1,
    divisionLabel: 'Premier League',
    country: 'GB',
    source: 'rsssf-england-pilot',
  },
  {
    competitionQid: 'Q19510',
    level: 2,
    divisionLabel: 'Championship',
    country: 'GB',
    source: 'rsssf-england-pilot',
  },
  {
    competitionQid: 'Q19565',
    level: 3,
    divisionLabel: 'League One',
    country: 'GB',
    source: 'rsssf-england-pilot',
  },
  {
    competitionQid: 'Q48837',
    level: 4,
    divisionLabel: 'League Two',
    country: 'GB',
    source: 'rsssf-england-pilot',
  },
  {
    competitionQid: 'Q18504',
    level: 5,
    divisionLabel: 'National League',
    country: 'GB',
    source: 'rsssf-england-pilot',
  },
];

/** Índice por QID (QIDs únicos — garantido por teste). */
export const EN_PYRAMID_TIERS_BY_QID: Readonly<Record<string, EnDivisionTier>> = Object.freeze(
  EN_PYRAMID_TIERS.reduce<Record<string, EnDivisionTier>>((acc, t) => {
    acc[t.competitionQid] = t;
    return acc;
  }, {}),
);
