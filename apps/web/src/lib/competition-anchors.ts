/**
 * Mapeamento do portal (Operador, 08/10) — âncoras curadas da hierarquia de
 * competições. Dados confirmados NO BANCO DE PRODUÇÃO em 08/10/2026 (regra R4:
 * só entra o que existe no acervo; ids locais reais, não inventados).
 * Snapshot declarado: a lista pode crescer por PR à medida que o acervo
 * ganha novas competições-mãe com arestas WON.
 */

export interface AnchorCompetition {
  id: string;
  qid: string | null;
  name: string;
  country: string | null;
  gender: 'men' | 'women';
}

export type Locale = 'pt-br' | 'en-us' | 'es-es';

// --- Continentais (confederações) ---
export const CONTINENTAL_ANCHORS: AnchorCompetition[] = [
  { id: '9d50e9fa-bc31-4ea8-af77-e429f451ff52', qid: 'Q184795', name: 'Copa Libertadores', country: null, gender: 'men' },
  { id: '110b0da4-3426-46b2-8abe-41772ae2e200', qid: 'Q60585', name: 'Copa Sudamericana', country: null, gender: 'men' },
  { id: '8fae6a29-79c5-43d8-81ee-4b569361926b', qid: 'Q18756', name: 'UEFA Champions League', country: null, gender: 'men' },
  { id: '91cf395b-9788-4494-a382-497297cc97d0', qid: 'Q59365764', name: 'UEFA Conference League', country: null, gender: 'men' },
  { id: 'c58c32d7-df63-4ed4-b868-543894c82864', qid: 'Q484028', name: 'UEFA Super Cup', country: null, gender: 'men' },
  { id: '0eb70d7d-b029-4f29-ab64-f20dfd3fa9d1', qid: 'Q193041', name: 'AFC Champions League Elite', country: null, gender: 'men' },
];

// --- Nacionais: agrupadas por país ( ordenadas por arestas WON do acervo ) ---
export interface NationalAnchorGroup {
  country: string; // ISO 3166-1 alpha-2
  items: AnchorCompetition[];
}

export const NATIONAL_ANCHOR_GROUPS: NationalAnchorGroup[] = [
  {
    country: 'GB',
    items: [
      { id: 'ee6d8f0e-6ddc-4073-8f2a-48f9ca70b5e0', qid: 'Q308822', name: 'Scottish Cup', country: 'GB', gender: 'men' },
      { id: '14c7282d-dad1-4750-a27c-e917dde4f4ac', qid: 'Q11151', name: 'FA Cup', country: 'GB', gender: 'men' },
      { id: 'c8d8a855-4f34-4223-befa-afbee4272e6b', qid: 'Q864672', name: 'Scottish League Cup', country: 'GB', gender: 'men' },
      { id: 'b8c3596a-fb09-4e4c-b110-8507f074496c', qid: 'Q2261276', name: 'Scottish Football League', country: 'GB', gender: 'men' },
    ],
  },
  {
    country: 'BR',
    items: [
      { id: 'a37cdeef-55de-4e7f-95ed-07efdbf334f8', qid: 'Q1348155', name: 'Campeonato Paulista de Futebol', country: 'BR', gender: 'men' },
      { id: 'a1f21c8b-a77b-4658-9dcc-288a227dc463', qid: 'Q2469206', name: 'Campeonato Cearense', country: 'BR', gender: 'men' },
      { id: 'd4b2c896-a33e-4178-98fb-ac8abe2223e1', qid: 'Q843989', name: 'Copa do Brasil', country: 'BR', gender: 'men' },
    ],
  },
  {
    country: 'IT',
    items: [
      { id: 'e15c6a2b-c7a0-452c-b9f9-aed880fbc438', qid: 'Q194052', name: 'Serie B', country: 'IT', gender: 'men' },
      { id: '99ae01fd-d78f-487a-b806-5e17311e5092', qid: 'Q169918', name: 'Coppa Italia', country: 'IT', gender: 'men' },
    ],
  },
  {
    country: 'FR',
    items: [
      { id: '96945f96-d137-4ac1-84f1-84b1dc5a6f0d', qid: 'Q13394', name: 'Ligue 1', country: 'FR', gender: 'men' },
    ],
  },
  {
    country: 'ES',
    items: [
      { id: '9b36dd0b-9b82-41f9-afe0-19b782d83e51', qid: 'Q483794', name: 'Copa del Rey', country: 'ES', gender: 'men' },
    ],
  },
  {
    country: 'BE',
    items: [
      { id: '86e3c44b-a676-46ca-8edd-9189efa80406', qid: 'Q216022', name: 'Belgian Pro League', country: 'BE', gender: 'men' },
    ],
  },
  {
    country: 'SE',
    items: [
      { id: 'de23c233-1659-4ac0-89b6-6c2028a9c2f8', qid: 'Q202243', name: 'Allsvenskan', country: 'SE', gender: 'men' },
    ],
  },
  {
    country: 'NO',
    items: [
      { id: '5ddc04db-75b0-424a-a2c4-75fe3a7380d2', qid: 'Q617335', name: 'Norwegian Football Cup', country: 'NO', gender: 'men' },
    ],
  },
  {
    country: 'RO',
    items: [
      { id: '3bd33aaf-063b-4698-8f7e-8442a0e0f7bd', qid: 'Q237753', name: 'Liga I', country: 'RO', gender: 'men' },
    ],
  },
];

// --- Feminino (acervo T450; 0 arestas WON hoje — rankings adiados por decisão) ---
export const WOMEN_ANCHORS: AnchorCompetition[] = [
  { id: '28b9b4a6-6ae8-4062-aec6-5f3ca127d421', qid: null, name: 'Campeonato Brasileiro de Futebol Feminino - Série A1', country: 'BR', gender: 'women' },
  { id: '1ddd7fbf-90b6-4aca-aea1-50f1548ada33', qid: null, name: 'Campeonato Brasileiro de Futebol Feminino - Série A2', country: 'BR', gender: 'women' },
  { id: '88071e41-4a66-4f0f-9afb-ec01853b8215', qid: null, name: 'Campeonato Carioca de Futebol Feminino', country: 'BR', gender: 'women' },
  { id: 'ed599b52-7fe7-4f99-82c2-ff1b6c9bddd9', qid: null, name: 'Campeonato Paulista de Futebol Feminino', country: 'BR', gender: 'women' },
  { id: '7d74e829-6222-4955-873e-9fdee9523421', qid: null, name: 'Campeonato Baiano de Futebol Feminino', country: 'BR', gender: 'women' },
  { id: '43fb460d-80a2-48c8-944c-98b2937b1643', qid: null, name: 'Campeonato Catarinense de Futebol Feminino', country: 'BR', gender: 'women' },
  { id: 'ba8699c7-f9a6-4e09-a36c-223f55e388a3', qid: null, name: 'Campeonato Gaúcho de Futebol Feminino', country: 'BR', gender: 'women' },
  { id: 'ce2599a8-88a4-4820-95fe-bcc995f986fa', qid: null, name: 'Campeonato Mineiro de Futebol Feminino', country: 'BR', gender: 'women' },
  { id: '9b64436e-cfd5-47dc-bf6d-3ba87d2c3486', qid: 'Q609757', name: 'Frauen-Bundesliga', country: null, gender: 'women' },
];

// --- Contadores do acervo (produção, 08/10/2026) ---
export const PORTAL_COUNTS = {
  competitions: 1921,
  countries: 197,
  continental: 162,
  women: 16,
  /** Arestas WON de competições femininas — 0 hoje (rankings adiados, D-2026-10-06). */
  womenWithTitles: 0,
};

const COUNTRY_LABELS: Record<string, Record<Locale, string>> = {
  BR: { 'pt-br': 'Brasil', 'en-us': 'Brazil', 'es-es': 'Brasil' },
  GB: { 'pt-br': 'Reino Unido', 'en-us': 'United Kingdom', 'es-es': 'Reino Unido' },
  IT: { 'pt-br': 'Itália', 'en-us': 'Italy', 'es-es': 'Italia' },
  FR: { 'pt-br': 'França', 'en-us': 'France', 'es-es': 'Francia' },
  ES: { 'pt-br': 'Espanha', 'en-us': 'Spain', 'es-es': 'España' },
  BE: { 'pt-br': 'Bélgica', 'en-us': 'Belgium', 'es-es': 'Bélgica' },
  SE: { 'pt-br': 'Suécia', 'en-us': 'Sweden', 'es-es': 'Suecia' },
  NO: { 'pt-br': 'Noruega', 'en-us': 'Norway', 'es-es': 'Noruega' },
  RO: { 'pt-br': 'Romênia', 'en-us': 'Romania', 'es-es': 'Rumania' },
};

export function countryLabel(country: string, locale: Locale): string {
  return COUNTRY_LABELS[country]?.[locale] ?? country;
}
