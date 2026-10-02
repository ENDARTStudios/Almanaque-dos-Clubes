/**
 * WS-D M1b-conservadora — Tipos do motor de expansão (clubes + competições). PURO.
 */
export const M1B_FILTERS_VERSION = 'm1b-conservative-v1';
export const M1B_IMPORTED_FROM = 'wikidata-expansion-v1';
export const M1B_SOURCE = 'wikidata';
export const M1B_LICENSE = 'CC0';

/** Mapa país QID → ISO 3166-1 alpha-2 (subconjunto versionado dos países-alvo). */
export const COUNTRY_QID_TO_ISO: Readonly<Record<string, string>> = {
  Q155: 'BR',
  Q45: 'PT',
  Q183: 'DE',
  Q142: 'FR',
  Q29: 'ES',
  Q38: 'IT',
  Q30: 'US',
  Q31: 'BE',
  Q34: 'SE',
  Q36: 'PL',
  Q55: 'NL',
  Q35: 'DK',
  Q28: 'HU',
  Q39: 'CH',
  Q33: 'FI',
  Q145: 'GB',
  Q414: 'AR',
  Q77: 'UY',
  Q739: 'CO',
  Q298: 'CL',
  Q419: 'PE',
  Q96: 'MX',
  Q16: 'CA',
  Q20: 'NO',
  Q40: 'AT',
  Q213: 'CZ',
  Q224: 'HR',
  Q403: 'RS',
  Q41: 'GR',
  Q43: 'TR',
  Q17: 'JP',
  Q884: 'KR',
  Q408: 'AU',
  Q664: 'NZ',
  Q258: 'ZA',
  Q79: 'EG',
  Q1028: 'MA',
  Q1033: 'NG',
  Q117: 'GH',
};
export const COUNTRY_ISO_TO_QID: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(COUNTRY_QID_TO_ISO).map(([q, iso]) => [iso, q]),
);

export interface RawCandidate {
  qid: string;
  labelPt: string | null;
  labelEn: string | null;
  description: string | null;
  aliases?: string[];
  p31: string[];
  p17: string[];
  p576: string[];
  p115?: string[];
  p159?: string[];
  p131?: string[];
  /** Coordenada direta P625 da própria entidade (raro em clubes). */
  p625?: { lat: number; lng: number } | null;
  inceptionYear?: number | null;
}

export interface ClubPlanRow {
  qid: string;
  action: 'create' | 'skip';
  skipReason?: string;
  name?: string;
  fullName?: string | null;
  country?: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  foundedYear?: number | null;
}

export interface CompetitionPlanRow {
  qid: string;
  action: 'create' | 'skip';
  skipReason?: string;
  name?: string;
  country?: string | null;
}

export interface PlanSkips {
  existing_qid?: number;
  soft_deleted_qid_reserved?: number;
  possible_homonym?: number;
  possible_competition_name_conflict?: number;
  missing_country_iso?: number;
  missing_label?: number;
  excluded_type?: number;
  dissolved?: number;
  invalid_schema_required_field?: number;
  [k: string]: number | undefined;
}

export interface ClubPlan {
  stage: 'PILOT' | 'FULL';
  country: string;
  retrievedAt: string;
  filtersVersion: string;
  rows: ClubPlanRow[];
  wouldCreate: number;
  skips: PlanSkips;
  coordinateCoverage: { with_coords: number; without_coords: number; percent: number };
}
