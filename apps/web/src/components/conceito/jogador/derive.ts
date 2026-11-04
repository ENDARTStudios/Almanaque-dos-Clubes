import type { Locale } from '@/i18n/config';
import type {
  JogadorAchievement,
  JogadorAward,
  JogadorCareerRow,
  JogadorMediaEnrichment,
  JogadorPhoto,
} from './types';

/**
 * DERIVAÇÕES da ficha de jogador — funções puras, sem fetch e sem estado.
 *
 * Tudo o que sai daqui é soma/agrupamento de dado real que a API entregou. O que não existe
 * vira `null` e a tela declara "—"; nunca 0, nunca estimativa. A única divisão é a MÉDIA
 * (gols ÷ jogos), exatamente a operação que o quadro pede.
 */

/** Locale interno → tag BCP 47 que o `Intl` aceita. */
const INTL_TAG: Record<Locale, string> = {
  'pt-br': 'pt-BR',
  'en-us': 'en-US',
  'es-es': 'es-ES',
};

const GAP = '—';

/**
 * Temporada honesta: "1956–1974" fechada; "1956–" em aberto (sem inventar fim).
 * Mesma régua que a página já usava antes da migração.
 */
export function seasonSpanLabel(row: {
  year: number | null;
  endYear: number | null;
}): string | null {
  if (row.year == null) return null;
  return row.endYear != null ? `${row.year}–${row.endYear}` : `${row.year}–`;
}

/** Gols ÷ jogos. `null` quando falta um dos dois números (lacuna, não zero). */
export function goalsPerGame(goals: number | null, apps: number | null): number | null {
  if (goals == null || apps == null || apps <= 0) return null;
  return goals / apps;
}

/** Média com o separador decimal do idioma; `null` quando não há o que calcular. */
export function formatAverage(value: number | null, locale: Locale): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(INTL_TAG[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** "1980 · 2020" — só anos reais, em ordem crescente; `null` quando nenhum foi catalogado. */
export function formatYears(years: number[]): string | null {
  if (years.length === 0) return null;
  return [...years].sort((a, b) => a - b).join(' · ');
}

export interface CareerClubRow {
  key: string;
  clubId: string;
  clubName: string;
  /** Períodos das passagens catalogadas, em ordem crescente. Vazio quando não há ano. */
  periods: string[];
  /** Só soma quando TODAS as passagens do clube têm o número — somar parcial engana. */
  apps: number | null;
  goals: number | null;
  average: number | null;
  /** Ano mais recente da passagem (ordenação); `null` quando nenhuma tem ano. */
  latestYear: number | null;
}

/**
 * Agrupa as arestas PLAYED_FOR por CLUBE — a CARREIRA do quadro é por clube, e a tabela
 * "Gols por passagem" é que mostra cada passagem. Somas só entram quando o número existe em
 * todas as passagens daquele clube; caso contrário a célula declara "—".
 */
export function groupCareerByClub(career: JogadorCareerRow[]): CareerClubRow[] {
  const byClub = new Map<string, { clubName: string; rows: JogadorCareerRow[] }>();
  for (const row of career) {
    const entry = byClub.get(row.clubId) ?? { clubName: row.clubName, rows: [] };
    entry.rows.push(row);
    byClub.set(row.clubId, entry);
  }

  const rows: CareerClubRow[] = [...byClub.entries()].map(([clubId, entry]) => {
    const periods = [
      ...new Set(
        entry.rows
          .filter((row) => row.year != null)
          .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
          .map((row) => seasonSpanLabel(row))
          .filter((value): value is string => value != null),
      ),
    ];
    const sum = (field: 'apps' | 'goals'): number | null =>
      entry.rows.every((row) => row[field] != null)
        ? entry.rows.reduce((total, row) => total + (row[field] as number), 0)
        : null;
    const apps = sum('apps');
    const goals = sum('goals');
    const latestYear = entry.rows.reduce<number | null>(
      (max, row) => (row.year != null && (max == null || row.year > max) ? row.year : max),
      null,
    );
    return {
      key: clubId,
      clubId,
      clubName: entry.clubName,
      periods,
      apps,
      goals,
      average: goalsPerGame(goals, apps),
      latestYear,
    };
  });

  return rows.sort(
    (a, b) => (b.latestYear ?? -1) - (a.latestYear ?? -1) || a.clubName.localeCompare(b.clubName),
  );
}

/** Passagens com gols catalogados — a matéria de "Gols por passagem". */
export function stintsWithGoals(career: JogadorCareerRow[]): JogadorCareerRow[] {
  return career.filter((row) => row.goals != null && row.goals > 0);
}

export interface AchievementRow {
  key: string;
  competitionId: string;
  competitionName: string;
  titles: number;
  years: number[];
}

/** Agrupa as conquistas (arestas WON) por competição. */
export function groupAchievements(list: JogadorAchievement[]): AchievementRow[] {
  const byKey = new Map<string, AchievementRow>();
  for (const achievement of list) {
    const key = achievement.competitionId || achievement.competitionName || GAP;
    const row = byKey.get(key) ?? {
      key,
      competitionId: achievement.competitionId,
      competitionName: achievement.competitionName,
      titles: 0,
      years: [],
    };
    row.titles += 1;
    if (achievement.year != null && !row.years.includes(achievement.year)) {
      row.years.push(achievement.year);
    }
    byKey.set(key, row);
  }
  return [...byKey.values()].sort(
    (a, b) => b.titles - a.titles || a.competitionName.localeCompare(b.competitionName),
  );
}

export interface AwardRow {
  key: string;
  label: string;
  times: number;
  years: number[];
  sourceUrl: string | null;
  latestYear: number | null;
}

/** Agrupa os prêmios individuais pelo nome do prêmio, mantendo a fonte por item. */
export function groupAwards(list: JogadorAward[]): AwardRow[] {
  const byKey = new Map<string, AwardRow>();
  for (const award of list) {
    const label = award.label.trim();
    if (label.length === 0) continue;
    const key = label.toLocaleLowerCase();
    const row = byKey.get(key) ?? {
      key,
      label,
      times: 0,
      years: [],
      sourceUrl: null,
      latestYear: null,
    };
    row.times += 1;
    if (award.year != null) {
      if (!row.years.includes(award.year)) row.years.push(award.year);
      if (row.latestYear == null || award.year > row.latestYear) row.latestYear = award.year;
    }
    if (row.sourceUrl == null && award.sourceUrl) row.sourceUrl = award.sourceUrl;
    byKey.set(key, row);
  }
  return [...byKey.values()].sort(
    (a, b) =>
      (b.latestYear ?? -1) - (a.latestYear ?? -1) ||
      b.times - a.times ||
      a.label.localeCompare(b.label),
  );
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Retrato + proveniência REAL. A licença vem de `mediaEnrichment.commonsPhoto`, gravada pelo
 * coletor; quando não existe, fica `null` e a ficha DECLARA a lacuna — nunca presume CC.
 */
export function photoProvenance(
  photoUrl: string | null | undefined,
  mediaEnrichment: unknown,
): JogadorPhoto {
  const root =
    mediaEnrichment && typeof mediaEnrichment === 'object'
      ? (mediaEnrichment as JogadorMediaEnrichment)
      : null;
  const entry = root?.commonsPhoto ?? null;
  return {
    url: nonEmptyText(photoUrl),
    license: nonEmptyText(entry?.license),
    author: nonEmptyText(entry?.author),
    sourceUrl: nonEmptyText(entry?.sourceUrl),
  };
}
