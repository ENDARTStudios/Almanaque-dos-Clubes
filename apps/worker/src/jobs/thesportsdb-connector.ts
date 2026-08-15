// TheSportsDB REST API connector
// https://www.thesportsdb.com — Free tier API key from env

export interface SportsDbTeam {
  name: string;
  country: string;
  league: string;
  founded?: number;
  stadium?: string;
  stadiumCapacity?: number;
  badgeUrl?: string;
  description?: string;
  website?: string;
}

export interface SportsDbPlayer {
  name: string;
  nationality?: string;
  position?: string;
  birthDate?: string;
  teamName?: string;
  height?: string;
  weight?: string;
  thumbUrl?: string;
}

export const BRAZIL_SERIE_A = 4421;
export const COPA_DO_BRASIL = 4425;
export const COPA_LIBERTADORES = 4480;

const PREFIX = '[SportsDB]';
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

function isApiKeyMissing(): boolean {
  if (!process.env.SPORTSDB_API_KEY) {
    console.warn(`${PREFIX} SPORTSDB_API_KEY env var not set — API calls disabled`);
    return true;
  }
  return false;
}

async function sportsDbFetch(endpoint: string, params?: Record<string, string>): Promise<any> {
  if (isApiKeyMissing()) return null;

  const url = new URL(`${BASE_URL}/${process.env.SPORTSDB_API_KEY}/${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const res = await fetch(url.toString());

    if (!res.ok) {
      console.error(`${PREFIX} HTTP ${res.status} on ${endpoint}`);
      return null;
    }

    return res.json();
  } catch (err) {
    console.error(`${PREFIX} Network error on ${endpoint}:`, (err as Error).message);
    return null;
  }
}

export async function fetchSportsDbBrazilianTeams(): Promise<SportsDbTeam[]> {
  const data = await sportsDbFetch('lookup_all_teams.php', { id: String(BRAZIL_SERIE_A) });

  if (!data?.teams) {
    const patreonData = await sportsDbFetch('searchteams.php', { t: 'Brazil' });
    if (!patreonData?.teams) return [];

    const results: SportsDbTeam[] = patreonData.teams.map(parseTeamData);
    console.log(`${PREFIX} Fetched ${results.length} teams via search`);
    return results;
  }

  const results = data.teams.map(parseTeamData);
  console.log(`${PREFIX} Fetched ${results.length} Brazilian teams`);
  return results;
}

function parseTeamData(t: any): SportsDbTeam {
  return {
    name: t.strTeam ?? t.strTeamAlternate ?? '',
    country: t.strCountry ?? 'Brazil',
    league: t.strLeague ?? '',
    founded: t.intFormedYear ? parseInt(t.intFormedYear, 10) : undefined,
    stadium: t.strStadium,
    stadiumCapacity: t.intStadiumCapacity ? parseInt(t.intStadiumCapacity, 10) : undefined,
    badgeUrl: t.strBadge ?? t.strTeamBadge,
    description: t.strDescriptionEN ?? t.strDescriptionPT,
    website: t.strWebsite,
  };
}

export async function fetchSportsDbTeamPlayers(teamId: string): Promise<SportsDbPlayer[]> {
  const data = await sportsDbFetch('lookup_all_players.php', { id: teamId });

  if (!data?.player) return [];

  const results: SportsDbPlayer[] = data.player.map((p: any) => ({
    name: p.strPlayer ?? '',
    nationality: p.strNationality,
    position: p.strPosition,
    birthDate: p.dateBorn,
    teamName: p.strTeam,
    height: p.strHeight,
    weight: p.strWeight,
    thumbUrl: p.strThumb ?? p.strCutout,
  }));

  console.log(`${PREFIX} Fetched ${results.length} players for team ${teamId}`);
  return results;
}
