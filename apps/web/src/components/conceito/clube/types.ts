/**
 * Tipos da ficha de clube no conceito FICHA.
 *
 * São os mesmos contratos que a página já consumia (GET /clubs/:id/profile,
 * /statistics, /kits, /anthem, /pennants, /crests) mais os três recortes que a
 * composição do quadro exige e que a API já publica: elenco (GET /players?clubId=),
 * linha do tempo (GET /clubs/:id/timeline) e clubes relacionados
 * (GET /clubs/:id/related). Nenhum campo é inventado aqui — campo ausente é ausente.
 */

export interface GeoAttribution {
  geo: string;
  source: string;
  license: string;
}

export interface EditorialEntry {
  extract?: string;
  description?: string;
  sourceUrl?: string;
}

/** Shape real de `editorialText` no acervo: pt/en/es + a licença no topo. */
export interface ClubEditorial {
  pt?: EditorialEntry | null;
  en?: EditorialEntry | null;
  es?: EditorialEntry | null;
  license?: string;
}

export interface ClubeMedia {
  logoUrl: string | null;
  teamColors?: string[] | null;
  kind?: string;
  federation?: string | null;
  stadium?: {
    name: string | null;
    image: string | null;
    capacity: number | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

export interface ClubProfile {
  id: string;
  qid: string | null;
  name: string;
  fansCount?: number | null;
  website?: string | null;
  infobox?: Record<string, string> | null;
  /** T507 — texto editorial por idioma (Wikipedia, CC-BY-SA). */
  editorial?: ClubEditorial | null;
  socialLinks?: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot?: (Record<string, number | null> & { updatedAt?: string }) | null;
  fullName: string | null;
  shortName: string | null;
  status: string;
  /** T450 — 'men' | 'women' | 'mixed'. */
  gender?: 'men' | 'women' | 'mixed';
  country: string | null;
  state: string | null;
  city: string | null;
  foundedYear: number | null;
  geo: {
    latitude: number | null;
    longitude: number | null;
    coordSource: string | null;
    coordPrecision: string | null;
    attribution: GeoAttribution | null;
  };
  provenance: {
    source: 'wikidata' | 'rsssf' | 'seed' | null;
    sourceUrl: string | null;
    importedFrom: string | null;
    retrievedAt: string | null;
  };
  titles: {
    available: boolean;
    items: Array<{
      year: number | null;
      season: string | null;
      competition: { id: string; name: string | null } | null;
      hierarchy: string;
      gender: 'men' | 'women';
      sourceUrl: string | null;
    }>;
    limitations: string[];
  };
  rankings: {
    available: boolean;
    items: Array<{
      rankingId: string;
      rankingName: string;
      scope: string | null;
      season: string | null;
      competitionId: string | null;
      competitionName: string | null;
      position: number | null;
      points: number | null;
      publishedAt: string | null;
    }>;
    limitations: string[];
  };
  competitions: {
    available: boolean;
    items: Array<{
      id: string;
      qid: string | null;
      name: string | null;
      type: string | null;
      country: string | null;
    }>;
    limitations: string[];
  };
  related: {
    available: boolean;
    items: Array<{
      relation: string;
      direction: 'source' | 'target';
      otherId: string;
      otherType: string;
      sourceUrl: string | null;
    }>;
    limitations: string[];
  };
  gaps: string[];
  /** T502 — mídia do clube (escudo/estádio); null honesto quando ausente. */
  media?: ClubeMedia | null;
}

export interface ClubStatistics {
  overall: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
    home: {
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
    away: {
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
  };
  byCompetition: Array<{
    competitionId?: string | null;
    competitionName: string | null;
    season: string | null;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }>;
  topRivals: Array<{
    opponentId: string;
    opponentName: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
  opponents: number;
}

export interface KitPart {
  pattern: string | null;
  color: string | null;
  file: string | null;
  fileUrl: string | null;
  license: string | null;
}

export interface KitEntry {
  season: string | null;
  type: string;
  label: string;
  parts?: Record<string, KitPart>;
  image?: { url: string; sourceUrl: string; license: string };
  sourceUrl: string;
}

export interface Anthem {
  composer: string | null;
  lyricist: string | null;
  year: number | null;
  official: boolean | null;
  label: string | null;
  note: string | null;
  audioUrl: string | null;
  audioLicense: string | null;
  audioSourceUrl: string | null;
  lyrics: null;
  lyricsRestricted: boolean;
  sourceUrl: string;
  attribution: string;
}

export interface Pennant {
  imageUrl: string;
  sourceUrl: string;
  license: string;
  description: string | null;
  year: number | null;
  type: string | null;
  curiosities: string | null;
}

export interface Crest {
  id: string;
  imageUrl: string;
  sourceUrl: string;
  license: string;
  attribution: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  isCurrent: boolean;
  periodLabel: string | null;
}

/** Item de GET /players?clubId= — idade é derivada de birthDate na apresentação. */
export interface SquadPlayer {
  id: string;
  fullName: string;
  shortName: string | null;
  birthDate: string | null;
  country: string | null;
  position: string | null;
}

export interface TimelineItem {
  year: number | null;
  season: string | null;
  competitionId: string | null;
  competitionQid: string | null;
  competitionName: string | null;
  hierarchy: string;
  source: string | null;
  sourceUrl: string | null;
}

export interface TimelineData {
  clubId: string;
  qid: string | null;
  name: string;
  timeline: TimelineItem[];
  totalTitles: number;
  byHierarchy: Record<string, number>;
}

export interface RelatedClub {
  clubId: string;
  qid: string | null;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  relationType: 'same_city' | 'same_state' | 'same_competition' | 'rival';
  confidence: number;
}
