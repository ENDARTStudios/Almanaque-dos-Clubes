// RSSSF (Rec.Sport.Soccer Statistics Foundation) connector
// Fonte: https://www.rsssf.org

export interface RsssfClubData {
  name: string;
  country: string;
  foundedYear?: number;
  city?: string;
}

export interface RsssfCompetitionData {
  name: string;
  country: string;
  season: string;
  clubs: string[];
}

const RSSSF_COUNTRY_URLS: Record<string, string> = {
  brazil: 'https://www.rsssf.org/tablesb/brazil.html',
  brasil: 'https://www.rsssf.org/tablesb/brazil.html',
  argentina: 'https://www.rsssf.org/tablesa/argentina.html',
  uruguay: 'https://www.rsssf.org/tablesu/uruguay.html',
  uruguai: 'https://www.rsssf.org/tablesu/uruguay.html',
};

const PREFIX_CODES: Record<string, string> = {
  brazil: 'b',
  brasil: 'b',
  argentina: 'a',
  uruguay: 'u',
  uruguai: 'u',
};

function buildRsssfUrl(country: string): string {
  const key = country.toLowerCase().trim();
  if (RSSSF_COUNTRY_URLS[key]) {
    return RSSSF_COUNTRY_URLS[key];
  }

  const prefix = PREFIX_CODES[key] ?? key.charAt(0);
  return `https://www.rsssf.org/tables${prefix}/${key}.html`;
}

async function fetchHtml(url: string): Promise<string> {
  try {
    console.log(`[RSSSF] Fetching ${url}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AlmanaqueDosClubes/1.0 (research bot; contact@almanaquedosclubes.com)',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.log(`[RSSSF] HTTP ${response.status} for ${url}`);
      return '';
    }

    return await response.text();
  } catch (err) {
    console.log(`[RSSSF] Fetch error for ${url}: ${(err as Error).message}`);
    return '';
  }
}

function extractTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowContent = trMatch[1];
    const cells: string[] = [];
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      cells.push(cleanHtml(tdMatch[1]));
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
    tdRegex.lastIndex = 0;
  }

  return rows;
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

function looksLikeClubName(text: string): boolean {
  if (!text || text.length < 1 || text.length > 60) return false;
  const skipWords =
    /^(team|club|total|average|goals|wins|draws|losses|pts|points|round|match|game|table|group|playoff|promotion|relegation|ties|gd|gf|ga)$/i;
  if (skipWords.test(text)) return false;
  return /[A-Za-zÀ-ÿ]/.test(text);
}

export async function fetchRsssfClubs(country: string): Promise<RsssfClubData[]> {
  console.log(`[RSSSF] Fetching clubs for ${country}...`);

  try {
    const url = buildRsssfUrl(country);
    const html = await fetchHtml(url);
    if (!html) {
      console.log(`[RSSSF] No HTML content for ${country}`);
      return [];
    }

    const rows = extractTableRows(html);
    const clubsMap = new Map<string, RsssfClubData>();

    for (const cells of rows) {
      for (const cell of cells) {
        if (!looksLikeClubName(cell)) continue;

        const year = extractYear(cell);
        const name = cell.replace(/\s*\(?\d{4}\)?\s*/, '').trim();

        if (!name || name.length < 2) continue;

        if (!clubsMap.has(name)) {
          clubsMap.set(name, {
            name,
            country,
            foundedYear: year,
            city: undefined,
          });
        } else if (year && !clubsMap.get(name)!.foundedYear) {
          clubsMap.get(name)!.foundedYear = year;
        }
      }
    }

    const clubs = Array.from(clubsMap.values());

    // Try to extract city info from cells that follow club name rows
    for (const cells of rows) {
      let lastClubIdx = -1;
      for (let i = 0; i < cells.length; i++) {
        const cleaned = cleanHtml(cells[i]);
        if (looksLikeClubName(cleaned) && !extractYear(cleaned)) {
          lastClubIdx = i;
        } else if (
          lastClubIdx >= 0 &&
          cleaned &&
          /^[A-Z][a-z]/.test(cleaned) &&
          cleaned.length < 30
        ) {
          const clubName = cleanHtml(cells[lastClubIdx]);
          const existing = clubs.find((c) => c.name === clubName);
          if (existing && !existing.city) {
            existing.city = cleaned.replace(/\s*\(?\d{4}\)?\s*/, '').trim();
          }
        }
      }
    }

    console.log(`[RSSSF] Found ${clubs.length} clubs for ${country}`);
    return clubs;
  } catch (err) {
    console.log(`[RSSSF] Error fetching clubs for ${country}: ${(err as Error).message}`);
    return [];
  }
}

export async function fetchRsssfCompetitions(country: string): Promise<RsssfCompetitionData[]> {
  console.log(`[RSSSF] Fetching competitions for ${country}...`);

  try {
    const url = buildRsssfUrl(country);
    const html = await fetchHtml(url);
    if (!html) {
      console.log(`[RSSSF] No HTML content for competitions in ${country}`);
      return [];
    }

    const results: RsssfCompetitionData[] = [];

    // Find heading sections with associated tables/club lists
    const headingRegex = /<(h[1-4]|b)\b[^>]*>([\s\S]*?)<\/(h[1-4]|b)>/gi;
    const headings: { text: string; index: number }[] = [];
    let hMatch: RegExpExecArray | null;
    while ((hMatch = headingRegex.exec(html)) !== null) {
      headings.push({ text: cleanHtml(hMatch[2]), index: hMatch.index });
    }

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const season = extractYear(heading.text)?.toString() ?? '';
      const compName = heading.text.replace(/\b\d{4}\b/, '').trim();

      if (!compName || compName.length < 3) continue;

      const nextIndex = i + 1 < headings.length ? headings[i + 1].index : html.length;
      const sectionHtml = html.slice(heading.index, nextIndex);
      const rows = extractTableRows(sectionHtml);

      const clubs: string[] = [];
      for (const cells of rows) {
        for (const cell of cells) {
          const cleaned = cleanHtml(cell);
          if (looksLikeClubName(cleaned) && !extractYear(cleaned)) {
            const name = cleaned.replace(/\s*\(?\d{4}\)?\s*/, '').trim();
            if (name && name.length >= 2 && !clubs.includes(name)) {
              clubs.push(name);
            }
          }
        }
      }

      if (clubs.length > 0) {
        results.push({
          name: compName || heading.text,
          country,
          season,
          clubs,
        });
      }
    }

    console.log(`[RSSSF] Found ${results.length} competitions for ${country}`);
    return results;
  } catch (err) {
    console.log(`[RSSSF] Error fetching competitions for ${country}: ${(err as Error).message}`);
    return [];
  }
}
