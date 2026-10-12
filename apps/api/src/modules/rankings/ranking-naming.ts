/**
 * T521 — Nome legível de um ranking 0-100. PURO (sem Prisma/BullMQ) para poder
 * ser testado isoladamente.
 *
 * Inclui a COMPETIÇÃO quando o ranking é de uma competição: sem isso os
 * rankings de um mesmo ano (Brasileirão, Premier League, Libertadores e o
 * agregado geral) ficariam com o mesmo nome e o usuário não conseguiria
 * distingui-los na UI.
 */

export type RankingGender = 'men' | 'women';

export function rankingNameFor(
  season: string,
  gender: RankingGender,
  competitionName?: string | null,
): string {
  const genderLabel = gender === 'women' ? 'Feminino' : 'Masculino';
  const scopeLabel = competitionName ? ` ${competitionName}` : '';
  return `Ranking 0-100${scopeLabel} ${season} — ${genderLabel}`;
}

/** T522 — nome do ranking de JOGADORES (o dado não tem dimensão de gênero). */
export function playerRankingNameFor(season: string, competitionName?: string | null): string {
  const scopeLabel = competitionName ? ` ${competitionName}` : '';
  return `Ranking de Jogadores 0-100${scopeLabel} ${season}`;
}
