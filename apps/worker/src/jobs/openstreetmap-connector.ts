// OpenStreetMap Overpass API connector
// https://overpass-api.de/api/interpreter — geolocation data for stadiums/venues

export interface OsmStadium {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  surface?: string;
  osmId: string;
}

const PREFIX = '[OSM]';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const ISO3166_CODES: Record<string, string> = {
  Brasil: 'BR',
  Brazil: 'BR',
  Argentina: 'AR',
  Uruguay: 'UY',
  Paraguay: 'PY',
  Chile: 'CL',
  Peru: 'PE',
  Colombia: 'CO',
  Ecuador: 'EC',
  Bolivia: 'BO',
  Venezuela: 'VE',
};

function buildOverpassQuery(queryStr: string): string {
  return `[out:json][timeout:30];${queryStr}`;
}

async function overpassQuery(queryStr: string): Promise<any> {
  const fullQuery = buildOverpassQuery(queryStr);
  const body = `data=${encodeURIComponent(fullQuery)}`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) {
      console.error(`${PREFIX} HTTP ${res.status} from Overpass API`);
      return null;
    }

    return res.json();
  } catch (err) {
    console.error(`${PREFIX} Overpass query error:`, (err as Error).message);
    return null;
  }
}

function parseOsmElement(el: any): OsmStadium {
  const tags: Record<string, string> = {};
  if (el.tags) {
    for (const key of Object.keys(el.tags)) {
      tags[key] = el.tags[key];
    }
  }

  const name = tags['name'] ?? tags['alt_name'] ?? 'Desconhecido';
  const city = tags['addr:city'];
  const state = tags['addr:state'] ?? tags['addr:province'];
  const country = tags['addr:country'];
  const capacity = tags['capacity'] ? parseInt(tags['capacity'], 10) : undefined;
  const surface = tags['surface'];
  const osmId = `${el.type}/${el.id}`;

  return {
    name,
    city,
    state,
    country,
    latitude: el.lat ?? el.center?.lat ?? 0,
    longitude: el.lon ?? el.center?.lon ?? 0,
    capacity: isNaN(capacity as number) ? undefined : capacity,
    surface,
    osmId,
  };
}

export async function fetchStadiumsByCountry(countryName: string): Promise<OsmStadium[]> {
  const isoCode = ISO3166_CODES[countryName] ?? countryName.substring(0, 2).toUpperCase();

  const query = `
    area["name"="Brazil"]["ISO3166-1"="BR"]->.country;
    (
      way["leisure"="stadium"](area.country);
      way["building"="stadium"](area.country);
      node["leisure"="stadium"](area.country);
    );
    out body;
    out skel qt;
  `;

  const data = await overpassQuery(query.replace('Brazil', countryName).replace('BR', isoCode));
  if (!data?.elements) return [];

  const results: OsmStadium[] = data.elements
    .filter((el: any) => el.tags?.name)
    .map(parseOsmElement);

  console.log(`${PREFIX} Fetched ${results.length} stadiums for ${countryName}`);
  return results;
}

export async function fetchStadiumByName(name: string, city?: string): Promise<OsmStadium | null> {
  const escapedName = name.replace(/"/g, '\\"');
  let filter = `["name"~"${escapedName}",i]`;

  const query = `
    (
      way["leisure"="stadium"]${filter};
      node["leisure"="stadium"]${filter};
      way["building"="stadium"]${filter};
    );
    out body 1;
  `;

  const data = await overpassQuery(query);
  if (!data?.elements?.length) return null;

  const stadium = parseOsmElement(data.elements[0]);

  if (city && stadium.city && !stadium.city.toLowerCase().includes(city.toLowerCase())) {
    return null;
  }

  console.log(`${PREFIX} Found stadium: ${stadium.name}`);
  return stadium;
}
