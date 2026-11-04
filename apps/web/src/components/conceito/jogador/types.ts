/**
 * Tipos da ficha de jogador no conceito FICHA.
 *
 * São os mesmos contratos que a página já consumia por GET /players/:id — o jogador
 * (`data`) e os extras do grafo (`profile`: carreira, conquistas, clubes, métricas e
 * prêmios). Nenhum campo é inventado aqui; campo ausente é ausente e vira lacuna declarada
 * ("—") na apresentação.
 *
 * O retrato tem proveniência própria: `photoUrl` é a URL da imagem e a licença/autor/fonte
 * vivem no `mediaEnrichment.commonsPhoto` do jogador (gravado pelo coletor do Commons).
 * Sem entrada catalogada, a licença é DECLARADA desconhecida — nunca presumida.
 */

/** Entrada de proveniência de mídia que o coletor grava em `Player.mediaEnrichment`. */
export interface JogadorMediaEntry {
  license?: string | null;
  author?: string | null;
  sourceUrl?: string | null;
}

/** JSONB `mediaEnrichment` do jogador — só a chave do retrato interessa aqui. */
export interface JogadorMediaEnrichment {
  commonsPhoto?: JogadorMediaEntry | null;
  [key: string]: unknown;
}

/** Identidade do jogador — espelha `GET /players/:id` (`data`). */
export interface JogadorIdentity {
  id: string;
  fullName: string;
  shortName?: string | null;
  nickname?: string | null;
  birthDate?: string | null;
  /** Derivada de `birthDate` na API (nunca armazenada). */
  age?: number | null;
  country?: string | null;
  position?: string | null;
  heightCm?: number | null;
  preferredFoot?: string | null;
  qid?: string | null;
  importedFrom?: string | null;
  sourceUrl?: string | null;
  fansCount?: number | null;
  officialSite?: string | null;
  socialLinks?: Record<string, { handle: string; url: string } | null> | null;
  followersSnapshot?: (Record<string, number | null> & { updatedAt?: string }) | null;
}

/** Retrato + a licença REAL do acervo (ou null quando a origem não publicou o uso). */
export interface JogadorPhoto {
  url: string | null;
  license: string | null;
  author: string | null;
  sourceUrl: string | null;
}

/** Linha de carreira: uma aresta PLAYED_FOR com ano/período e números quando existem. */
export interface JogadorCareerRow {
  year: number | null;
  endYear: number | null;
  apps: number | null;
  goals: number | null;
  clubId: string;
  clubName: string;
}

export interface JogadorAchievement {
  competitionId: string;
  competitionName: string;
  year: number | null;
}

export interface JogadorAward {
  qid: string;
  label: string;
  year: number | null;
  sourceUrl: string | null;
}

export interface JogadorClub {
  id: string;
  name: string;
  country: string | null;
}

/** Extras do grafo — espelha `profile` em `GET /players/:id`. */
export interface JogadorProfile {
  currentClub: { id: string; name: string } | null;
  career: JogadorCareerRow[];
  achievements: JogadorAchievement[];
  clubs: JogadorClub[];
  metrics: {
    totalApps: number;
    totalGoals: number;
    titlesCount: number;
    awardsCount: number;
  };
  individualAwards: JogadorAward[];
}
