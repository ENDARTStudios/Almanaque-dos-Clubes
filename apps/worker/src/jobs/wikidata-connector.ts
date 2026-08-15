// Wikidata SPARQL connector — fetches football entities from Wikidata
// Endpoint: https://query.wikidata.org/sparql

export interface WikidataClub {
  qid: string;
  name: string;
  fullName?: string;
  shortName?: string;
  city?: string;
  country?: string;
  foundedYear?: number;
  website?: string;
  league?: string;
}

export interface WikidataPlayer {
  qid: string;
  fullName: string;
  birthDate?: string;
  country?: string;
  position?: string;
  clubQid?: string;
}

export interface WikidataCompetition {
  qid: string;
  name: string;
  country?: string;
  type?: 'LEAGUE' | 'CUP' | 'TOURNAMENT' | 'SUPER_CUP';
}

export interface WikidataStadium {
  qid: string;
  name: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  surface?: string;
}

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

const COUNTRY_QID_MAP: Record<string, string> = {
  Q155: 'BR',
  Q414: 'AR',
  Q298: 'CL',
  Q739: 'CO',
  Q750: 'BO',
  Q717: 'PY',
  Q77: 'UY',
  Q786: 'DO',
  Q800: 'CR',
  Q183: 'DE',
  Q29: 'ES',
  Q142: 'FR',
  Q38: 'IT',
  Q30: 'US',
  Q45: 'PT',
  Q16: 'CA',
  Q145: 'GB',
  Q408: 'AU',
  Q43: 'TR',
  Q31: 'BE',
  Q55: 'NL',
  Q20: 'NO',
  Q34: 'SE',
  Q35: 'DK',
  Q36: 'PL',
  Q39: 'CH',
  Q40: 'AT',
  Q28: 'HU',
  Q41: 'GR',
  Q17: 'JP',
  Q884: 'KR',
  Q148: 'CN',
  Q159: 'RU',
  Q212: 'UA',
  Q27: 'IE',
  Q33: 'FI',
  Q213: 'CZ',
  Q218: 'RO',
  Q219: 'BG',
  Q222: 'AL',
  Q224: 'HR',
  Q225: 'BA',
  Q228: 'AD',
};

const COMPETITION_TYPE_P31_MAP: Record<string, WikidataCompetition['type']> = {
  Q2993294: 'LEAGUE',
  Q637184: 'CUP',
  Q15698644: 'TOURNAMENT',
  Q18336833: 'SUPER_CUP',
};

function extractQid(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1];
}

function mapCountryToIso(countryUri?: string): string | undefined {
  if (!countryUri) return undefined;
  return COUNTRY_QID_MAP[extractQid(countryUri)];
}

function bindingValue(binding: { type: string; value: string } | undefined): string | undefined {
  return binding?.value;
}

type SparqlBinding = { type: string; value: string };
type SparqlRow = Record<string, SparqlBinding>;

async function sparqlQuery(query: string): Promise<SparqlRow[]> {
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AlmanaqueDosClubes/1.0 (ETL worker)' },
    });
    if (!response.ok) {
      console.error(`[Wikidata] SPARQL query failed: HTTP ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { results?: { bindings?: SparqlRow[] } };
    return data?.results?.bindings ?? [];
  } catch (error) {
    console.error('[Wikidata] SPARQL query error:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function fetchWikidataClubs(country?: string): Promise<WikidataClub[]> {
  const countryFilter = country
    ? `?club wdt:P17 wd:${country.toUpperCase().startsWith('Q') ? country.toUpperCase() : `Q${country}`}.`
    : '';

  const query = `
    SELECT ?club ?clubLabel ?officialName ?shortName ?city ?cityLabel ?country ?foundedYear ?website WHERE {
      ?club wdt:P31/wdt:P279* wd:Q476028.
      ${countryFilter}
      OPTIONAL { ?club wdt:P1448 ?officialName. }
      OPTIONAL { ?club wdt:P1813 ?shortName. }
      OPTIONAL { ?club wdt:P131 ?city. }
      OPTIONAL { ?club wdt:P17 ?country. }
      OPTIONAL { ?club wdt:P571 ?foundedYear. }
      OPTIONAL { ?club wdt:P856 ?website. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,pt,es". }
    }
    LIMIT 200
  `;

  const bindings = await sparqlQuery(query);
  return bindings.map((b): WikidataClub => {
    const qid = extractQid(bindingValue(b.club)!);
    const foundedRaw = bindingValue(b.foundedYear);
    let foundedYear: number | undefined;
    if (foundedRaw) {
      const year = parseInt(foundedRaw.substring(0, 4), 10);
      if (!Number.isNaN(year)) foundedYear = year;
    }
    return {
      qid,
      name: bindingValue(b.clubLabel) ?? qid,
      fullName: bindingValue(b.officialName),
      shortName: bindingValue(b.shortName),
      city: bindingValue(b.cityLabel),
      country: mapCountryToIso(bindingValue(b.country)),
      foundedYear,
      website: bindingValue(b.website),
    };
  });
}

export async function fetchWikidataPlayers(clubQid?: string): Promise<WikidataPlayer[]> {
  const clubFilter = clubQid ? `?player wdt:P54 wd:${clubQid.toUpperCase()}.` : '';

  const query = `
    SELECT ?player ?playerLabel ?birthDate ?citizenship ?sportCountry ?position ?positionLabel ?club WHERE {
      ?player wdt:P31/wdt:P279* wd:Q937857.
      ${clubFilter}
      OPTIONAL { ?player wdt:P569 ?birthDate. }
      OPTIONAL { ?player wdt:P27 ?citizenship. }
      OPTIONAL { ?player wdt:P1532 ?sportCountry. }
      OPTIONAL { ?player wdt:P413 ?position. }
      OPTIONAL { ?player wdt:P54 ?club. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,pt,es". }
    }
    LIMIT 200
  `;

  const bindings = await sparqlQuery(query);
  return bindings.map((b): WikidataPlayer => ({
    qid: extractQid(bindingValue(b.player)!),
    fullName: bindingValue(b.playerLabel) ?? extractQid(bindingValue(b.player)!),
    birthDate: bindingValue(b.birthDate)?.substring(0, 10),
    country:
      mapCountryToIso(bindingValue(b.citizenship)) ?? mapCountryToIso(bindingValue(b.sportCountry)),
    position: bindingValue(b.positionLabel),
    clubQid: b.club ? extractQid(bindingValue(b.club)!) : undefined,
  }));
}

export async function fetchWikidataCompetitions(): Promise<WikidataCompetition[]> {
  const query = `
    SELECT ?comp ?compLabel ?country ?instanceOf WHERE {
      ?comp wdt:P31/wdt:P279* wd:Q15991303.
      ?comp wdt:P31 ?instanceOf.
      OPTIONAL { ?comp wdt:P17 ?country. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,pt,es". }
    }
    LIMIT 100
  `;

  const bindings = await sparqlQuery(query);
  return bindings.map((b): WikidataCompetition => {
    const rawQid = bindingValue(b.comp);
    const instanceQid = b.instanceOf ? extractQid(bindingValue(b.instanceOf)!) : undefined;
    return {
      qid: extractQid(rawQid!),
      name: bindingValue(b.compLabel) ?? extractQid(rawQid!),
      country: mapCountryToIso(bindingValue(b.country)),
      type: instanceQid ? COMPETITION_TYPE_P31_MAP[instanceQid] : undefined,
    };
  });
}

export async function fetchWikidataStadiums(country?: string): Promise<WikidataStadium[]> {
  const countryFilter = country
    ? `?stadium wdt:P17 wd:${country.toUpperCase().startsWith('Q') ? country.toUpperCase() : `Q${country}`}.`
    : '';

  const query = `
    SELECT ?stadium ?stadiumLabel ?city ?cityLabel ?country ?lat ?lon ?capacity ?surface ?surfaceLabel WHERE {
      ?stadium wdt:P31/wdt:P279* wd:Q1154710.
      ${countryFilter}
      OPTIONAL { ?stadium wdt:P131 ?city. }
      OPTIONAL { ?stadium wdt:P17 ?country. }
      OPTIONAL { ?stadium p:P625/psv:P625 ?coordNode. ?coordNode wikibase:geoLatitude ?lat. ?coordNode wikibase:geoLongitude ?lon. }
      OPTIONAL { ?stadium wdt:P1083 ?capacity. }
      OPTIONAL { ?stadium wdt:P765 ?surface. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,pt,es". }
    }
    LIMIT 100
  `;

  const bindings = await sparqlQuery(query);
  return bindings.map((b): WikidataStadium => ({
    qid: extractQid(bindingValue(b.stadium)!),
    name: bindingValue(b.stadiumLabel) ?? extractQid(bindingValue(b.stadium)!),
    city: bindingValue(b.cityLabel),
    country: mapCountryToIso(bindingValue(b.country)),
    latitude: b.lat ? parseFloat(b.lat.value) : undefined,
    longitude: b.lon ? parseFloat(b.lon.value) : undefined,
    capacity: b.capacity ? parseInt(b.capacity.value, 10) : undefined,
    surface: bindingValue(b.surfaceLabel),
  }));
}
