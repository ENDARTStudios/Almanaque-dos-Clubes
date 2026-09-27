/**
 * WS-D M1b-conservadora — Filtros PUROS de inclusão/exclusão (conservador > volume).
 * QID é identidade; nome só para display/detecção conservadora de conflito. Nunca fuzzy como identidade.
 */
import { COUNTRY_QID_TO_ISO, type RawCandidate } from './types.js';

export const QID_RE = /^Q[1-9][0-9]*$/;

const QID_FOOTBALL_CLUB = 'Q476028';
const QID_WOMENS_CLUB = 'Q7063062';
const QID_FUTSAL_CLUB = 'Q18534595';
const NATIONAL_TEAM_HINTS = /(sele[çc][aã]o|national (football )?team)/i;
const WOMENS_HINTS = /(feminin|women|female|feminino)/i;
const RESERVE_HINTS = /(\breserves?\b|\breserva\b|sub-?\d{2}|juvenil|youth|under-?\d{2}|\sB$)/i;
const FUTSAL_BEACH_HINTS = /(futsal|beach soccer|futebol de areia|futebol de praia)/i;

export interface ClubFilterResult {
  include: boolean;
  reason?: 'excluded_type' | 'dissolved' | 'missing_label' | 'missing_country_iso';
  iso2?: string;
}

/** Testa os hints contra cada campo individual (evita falsos do join). */
function matchesHint(c: RawCandidate, re: RegExp): boolean {
  return [c.labelPt, c.labelEn, c.description, ...(c.aliases ?? [])].some((s) => !!s && re.test(s));
}

/** Clube incluível? (P31 direto = Q476028; sem P576; sem hints de exclusão; país mapeável; label útil). */
export function filterClub(c: RawCandidate): ClubFilterResult {
  if (!QID_RE.test(c.qid)) return { include: false, reason: 'excluded_type' };
  if (!c.p31.includes(QID_FOOTBALL_CLUB)) return { include: false, reason: 'excluded_type' };
  if (c.p31.includes(QID_WOMENS_CLUB) || c.p31.includes(QID_FUTSAL_CLUB))
    return { include: false, reason: 'excluded_type' };
  if (c.p576.length > 0) return { include: false, reason: 'dissolved' };
  if (
    matchesHint(c, WOMENS_HINTS) ||
    matchesHint(c, RESERVE_HINTS) ||
    matchesHint(c, FUTSAL_BEACH_HINTS) ||
    matchesHint(c, NATIONAL_TEAM_HINTS)
  )
    return { include: false, reason: 'excluded_type' };
  const label = (c.labelPt ?? c.labelEn ?? '').trim();
  if (!label) return { include: false, reason: 'missing_label' };
  const iso2 = c.p17.map((q) => COUNTRY_QID_TO_ISO[q]).find(Boolean);
  if (!iso2) return { include: false, reason: 'missing_country_iso' };
  return { include: true, iso2 };
}

/** Nome para display (label pt → en). */
export function displayName(c: RawCandidate): string {
  return (c.labelPt ?? c.labelEn ?? '').trim();
}

/** foundedYear a partir de P571 (só se entre 1850 e o ano atual). */
export function validFoundedYear(year: number | null | undefined): number | null {
  if (year == null) return null;
  return year >= 1850 && year <= new Date().getUTCFullYear() ? year : null;
}

/** Classes P31 aceitas para COMPETIÇÃO (observadas em competições reais; versionado). */
export const COMPETITION_CLASS_WHITELIST: ReadonlyArray<string> = [
  'Q15991303', // liga/competição de futebol
  'Q8463186', // copa de futebol
  'Q15991290',
  'Q3270632',
  'Q18608583',
  'Q1478437', // competição desportiva recorrente
];

export interface CompetitionFilterResult {
  include: boolean;
  reason?: 'excluded_type' | 'missing_label' | 'missing_country_iso' | 'excluded_gender';
  iso2?: string;
}

/** Competição incluível? (classe whitelist; P17; sem hint feminino/juvenil; label útil). */
export function filterCompetition(c: RawCandidate): CompetitionFilterResult {
  if (!QID_RE.test(c.qid)) return { include: false, reason: 'excluded_type' };
  if (!c.p31.some((q) => COMPETITION_CLASS_WHITELIST.includes(q)))
    return { include: false, reason: 'excluded_type' };
  if (matchesHint(c, WOMENS_HINTS) || matchesHint(c, RESERVE_HINTS))
    return { include: false, reason: 'excluded_gender' };
  const label = (c.labelPt ?? c.labelEn ?? '').trim();
  if (!label) return { include: false, reason: 'missing_label' };
  const iso2 = c.p17.map((q) => COUNTRY_QID_TO_ISO[q]).find(Boolean);
  if (!iso2) return { include: false, reason: 'missing_country_iso' };
  return { include: true, iso2 };
}
