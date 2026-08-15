// Football-Data.org REST API connector
// https://www.football-data.org — Free tier: 10 req/min

export interface FootballDataTeam {
  name: string;
  shortName?: string;
  country: string;
  founded?: number;
  venue?: string;
  website?: string;
  league?: string;
}

export interface FootballDataMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  competition: string;
  round?: string;
  status: string;
}

export interface FootballDataCompetition {
  name: string;
  country: string;
  code: string;
}

const PREFIX = '[Football-Data]';
const BASE_URL = 'https://api.football-data.org/v4';
const MAX_RETRIES = 3;

function isApiKeyMissing(): boolean {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.warn(`${PREFIX} FOOTBALL_DATA_API_KEY env var not set — API calls disabled`);
    return true;
  }
  return false;
}

async function footballDataFetch(path: string, retries = 0): Promise<any> {
  if (isApiKeyMissing()) return null;

  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!,
      },
    });

    if (res.status === 429 && retries < MAX_RETRIES) {
      const delay = Math.pow(2, retries + 1) * 1000;
      console.warn(
        `${PREFIX} Rate limited (429) — retrying in ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return footballDataFetch(path, retries + 1);
    }

    if (!res.ok) {
      console.error(`${PREFIX} HTTP ${res.status} on GET /${path}`);
      return null;
    }

    return res.json();
  } catch (err) {
    console.error(`${PREFIX} Network error fetching /${path}:`, (err as Error).message);
    return null;
  }
}

export async function fetchFootballDataCompetitions(): Promise<FootballDataCompetition[]> {
  if (isApiKeyMissing()) return [];

  const BRAZILIAN_CODES = new Set(['BSA', 'CDB', 'CLI']);

  const data = await footballDataFetch('competitions');
  if (!data?.competitions) return [];

  const results: FootballDataCompetition[] = [];
  for (const c of data.competitions) {
    if (BRAZILIAN_CODES.has(c.code)) {
      results.push({
        name: c.name,
        country: c.area?.name ?? '',
        code: c.code,
      });
    }
  }

  console.log(`${PREFIX} Fetched ${results.length} competitions`);
  return results;
}

export async function fetchFootballDataTeams(competitionCode: string): Promise<FootballDataTeam[]> {
  if (isApiKeyMissing()) return [];

  const data = await footballDataFetch(`competitions/${competitionCode}/teams`);
  if (!data?.teams) return [];

  const results: FootballDataTeam[] = data.teams.map((t: any) => ({
    name: t.name,
    shortName: t.shortName,
    country: t.area?.name ?? '',
    founded: t.founded,
    venue: t.venue,
    website: t.website,
    league: t.runningCompetitions?.[0]?.name,
  }));

  console.log(`${PREFIX} Fetched ${results.length} teams for ${competitionCode}`);
  return results;
}

export async function fetchFootballDataMatches(
  competitionCode: string,
  season?: string,
): Promise<FootballDataMatch[]> {
  if (isApiKeyMissing()) return [];

  const seasonParam = season ? `?season=${season}` : '';
  const data = await footballDataFetch(`competitions/${competitionCode}/matches${seasonParam}`);
  if (!data?.matches) return [];

  const results: FootballDataMatch[] = data.matches.map((m: any) => ({
    homeTeam: m.homeTeam?.name ?? '',
    awayTeam: m.awayTeam?.name ?? '',
    homeScore: m.score?.fullTime?.home,
    awayScore: m.score?.fullTime?.away,
    date: m.utcDate,
    competition: m.competition?.name ?? '',
    round: m.matchday ? `Matchday ${m.matchday}` : undefined,
    status: m.status,
  }));

  console.log(`${PREFIX} Fetched ${results.length} matches for ${competitionCode}`);
  return results;
}
