// FBref (Football Statistics and History) connector
// Fonte: https://fbref.com

export interface FbrefClubData {
  name: string;
  country: string;
  league: string;
  foundedYear?: number;
  stadium?: string;
  squadSize?: number;
}

export interface FbrefMatchData {
  homeClub: string;
  awayClub: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  competition: string;
  season: string;
  round?: string;
  venue?: string;
}

const FBREF_LEAGUE_URLS: Record<string, string> = {
  'brasileirão série a': 'https://fbref.com/en/comps/24/Serie-A-Stats',
  'brasileirao serie a': 'https://fbref.com/en/comps/24/Serie-A-Stats',
  'brazilian série a': 'https://fbref.com/en/comps/24/Serie-A-Stats',
  'campeonato brasileiro': 'https://fbref.com/en/comps/24/Serie-A-Stats',
  'premier league': 'https://fbref.com/en/comps/9/Premier-League-Stats',
  'la liga': 'https://fbref.com/en/comps/12/La-Liga-Stats',
  'serie a itália': 'https://fbref.com/en/comps/11/Serie-A-Stats',
  'serie a italia': 'https://fbref.com/en/comps/11/Serie-A-Stats',
  bundesliga: 'https://fbref.com/en/comps/20/Bundesliga-Stats',
  'ligue 1': 'https://fbref.com/en/comps/13/Ligue-1-Stats',
};

const COMP_ID_OVERRIDES: Record<string, string> = {
  'brasileirão série a': '24',
  'brasileirao serie a': '24',
};

const RETRY_DELAY_MS = 2000;

async function fetchFbrefPage(url: string): Promise<string> {
  try {
    console.log(`[FBref] Fetching ${url}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AlmanaqueDosClubes/1.0 (research bot; contact@almanaquedosclubes.com)',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (response.status === 429) {
      console.log(`[FBref] Rate limited (429) for ${url}, retrying after ${RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      const retryResponse = await fetch(url, {
        headers: {
          'User-Agent': 'AlmanaqueDosClubes/1.0 (research bot; contact@almanaquedosclubes.com)',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!retryResponse.ok) {
        console.log(`[FBref] Retry HTTP ${retryResponse.status} for ${url}`);
        return '';
      }
      return await retryResponse.text();
    }

    if (!response.ok) {
      console.log(`[FBref] HTTP ${response.status} for ${url}`);
      return '';
    }

    return await response.text();
  } catch (err) {
    console.log(`[FBref] Fetch error for ${url}: ${(err as Error).message}`);
    return '';
  }
}

function cleanHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractYear(text: string): number | undefined {
  const match = text.match(/\b(1[89]\d{2}|20\d{2})\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

function resolveLeagueUrl(league: string): string | null {
  const key = league.toLowerCase().trim();
  if (FBREF_LEAGUE_URLS[key]) return FBREF_LEAGUE_URLS[key];

  for (const [name, url] of Object.entries(FBREF_LEAGUE_URLS)) {
    if (key.includes(name) || name.includes(key)) return url;
  }

  return null;
}

export async function fetchFbrefClubs(league: string): Promise<FbrefClubData[]> {
  console.log(`[FBref] Fetching clubs for ${league}...`);

  try {
    const url = resolveLeagueUrl(league);
    if (!url) {
      console.log(`[FBref] No URL mapping for league: ${league}`);
      return [];
    }

    const html = await fetchFbrefPage(url);
    if (!html) {
      console.log(`[FBref] No HTML content for ${league}`);
      return [];
    }

    const tableRegex =
      /<table[^>]*(?:id="stats_squads_standard_for"|class="[^"]*stats_table[^"]*")[^>]*>([\s\S]*?)<\/table>/gi;
    const tableMatch = tableRegex.exec(html);

    if (!tableMatch) {
      console.log(`[FBref] No squad stats table found for ${league}`);
      return [];
    }

    const tableHtml = tableMatch[1];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const clubs: FbrefClubData[] = [];
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowContent = rowMatch[1];
      const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
      const linkMatch = linkRegex.exec(rowContent);
      if (!linkMatch) continue;

      const name = cleanHtml(linkMatch[1]);
      if (!name || name.length < 2) continue;

      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let tdMatch: RegExpExecArray | null;
      while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
        cells.push(cleanHtml(tdMatch[1]));
      }

      let foundedYear: number | undefined;
      for (const cell of cells) {
        const y = extractYear(cell);
        if (y && y >= 1850 && y <= new Date().getFullYear()) {
          foundedYear = y;
          break;
        }
      }

      const squadSize =
        cells.length > 0 ? parseInt(cells[cells.length - 1], 10) || undefined : undefined;

      clubs.push({
        name,
        country: '',
        league,
        foundedYear,
        stadium: undefined,
        squadSize: squadSize && squadSize > 0 && squadSize < 100 ? squadSize : undefined,
      });
    }

    console.log(`[FBref] Found ${clubs.length} clubs for ${league}`);
    return clubs;
  } catch (err) {
    console.log(`[FBref] Error fetching clubs for ${league}: ${(err as Error).message}`);
    return [];
  }
}

export async function fetchFbrefMatches(
  competition: string,
  season: string,
): Promise<FbrefMatchData[]> {
  console.log(`[FBref] Fetching matches for ${competition} ${season}...`);

  try {
    let compId: string | undefined = COMP_ID_OVERRIDES[competition.toLowerCase().trim()];

    if (!compId) {
      const leagueUrl = resolveLeagueUrl(competition);
      if (!leagueUrl) {
        console.log(`[FBref] No URL mapping for competition: ${competition}`);
        return [];
      }
      const match = leagueUrl.match(/\/comps\/(\d+)\//);
      compId = match ? match[1] : undefined;
    }

    if (!compId) {
      console.log(`[FBref] Could not determine competition ID for ${competition}`);
      return [];
    }

    const scoresUrl = `https://fbref.com/en/comps/${compId}/${season}/schedule/${season}-${competition.replace(/\s+/g, '-')}-Scores-and-Fixtures`;
    console.log(`[FBref] Scores URL: ${scoresUrl}`);

    const html = await fetchFbrefPage(scoresUrl);
    if (!html) {
      console.log(`[FBref] No HTML content for ${competition} ${season}`);
      return [];
    }

    const tableRegex =
      /<table[^>]*(?:id="sched_all"|class="[^"]*stats_table[^"]*")[^>]*>([\s\S]*?)<\/table>/gi;
    const tableMatch = tableRegex.exec(html);

    if (!tableMatch) {
      console.log(`[FBref] No scores table found for ${competition} ${season}`);
      return [];
    }

    const tableHtml = tableMatch[1];
    const tbodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/gi;
    const tbodyMatch = tbodyRegex.exec(tableHtml);
    const bodyHtml = tbodyMatch ? tbodyMatch[1] : tableHtml;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const matches: FbrefMatchData[] = [];
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(bodyHtml)) !== null) {
      const rowContent = rowMatch[1];

      // Skip header or spacer rows
      if (/class="[^"]*thead[^"]*"/i.test(rowContent)) continue;
      if (/colspan/i.test(rowContent)) continue;

      // Date from data-stat="date"
      const dateRegex = /<td[^>]*data-stat="date"[^>]*>([\s\S]*?)<\/td>/i;
      const dateMatch = dateRegex.exec(rowContent);
      const date = dateMatch ? cleanHtml(dateMatch[1]) : '';

      // Home and away clubs from <a> tags
      const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
      const links: string[] = [];
      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkRegex.exec(rowContent)) !== null) {
        links.push(cleanHtml(linkMatch[1]));
      }

      if (links.length < 2) continue;

      const homeClub = links[0];
      const awayClub = links[1];

      // Scores from cells with class containing "right"
      const scoreRegex = /<td[^>]*class="[^"]*right[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;
      const scoreCells: string[] = [];
      let scoreMatch: RegExpExecArray | null;
      while ((scoreMatch = scoreRegex.exec(rowContent)) !== null) {
        scoreCells.push(cleanHtml(scoreMatch[1]));
      }

      let homeScore: number | undefined;
      let awayScore: number | undefined;
      if (scoreCells.length >= 2) {
        homeScore = parseInt(scoreCells[0], 10);
        awayScore = parseInt(scoreCells[1], 10);
        if (isNaN(homeScore)) homeScore = undefined;
        if (isNaN(awayScore)) awayScore = undefined;
      }

      // Round from data-stat="round"
      const roundRegex = /<td[^>]*data-stat="round"[^>]*>([\s\S]*?)<\/td>/i;
      const roundMatch = roundRegex.exec(rowContent);
      const round = roundMatch ? cleanHtml(roundMatch[1]) : undefined;

      // Venue from data-stat="venue"
      const venueRegex = /<td[^>]*data-stat="venue"[^>]*>([\s\S]*?)<\/td>/i;
      const venueMatch = venueRegex.exec(rowContent);
      const venue = venueMatch ? cleanHtml(venueMatch[1]) : undefined;

      if (!date || !homeClub || !awayClub) continue;

      matches.push({
        homeClub,
        awayClub,
        homeScore,
        awayScore,
        date,
        competition,
        season,
        round: round || undefined,
        venue: venue || undefined,
      });
    }

    console.log(`[FBref] Found ${matches.length} matches for ${competition} ${season}`);
    return matches;
  } catch (err) {
    console.log(
      `[FBref] Error fetching matches for ${competition} ${season}: ${(err as Error).message}`,
    );
    return [];
  }
}
