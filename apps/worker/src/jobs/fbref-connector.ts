// FBref (Football Statistics and History) connector
// Fonte: https://fbref.com

export interface FbrefMatchData {
  homeClub: string;
  awayClub: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  competition: string;
  season: string;
}

export async function fetchFbrefMatches(competition: string, season: string): Promise<FbrefMatchData[]> {
  // TODO: Implement FBref scraper/parser
  // FBref organiza partidas em tabelas HTML por competição/temporada
  console.log(`[FBref] Fetching matches for ${competition} ${season}...`);
  return [];
}
