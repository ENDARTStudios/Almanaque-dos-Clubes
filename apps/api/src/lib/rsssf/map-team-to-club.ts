/**
 * T448b-2b FASE 1 — Mapeamento time→clube do acervo. PURO.
 * Matching DETERMINÍSTICO por nome/alias normalizado (igualdade exata) e QID.
 * PROIBIDO fuzzy score como chave primária. 0 match = missing_club;
 * >1 = ambiguous_club; clube inativo = club_inactive (não reativar).
 */
import type { ClubIndexEntry, ReasonCode } from './types.js';

/**
 * Normalização canônica (unicode NFD, sem acento, minúsculo, pontuação→espaço).
 * NÃO remove sufixos legais — a identidade do clube de estadual depende deles.
 */
export function normalizeTeamName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildClubIndex(index: ClubIndexEntry[]): Map<string, ClubIndexEntry[]> {
  const map = new Map<string, ClubIndexEntry[]>();
  const add = (raw: string | undefined, entry: ClubIndexEntry) => {
    if (!raw) return;
    const key = normalizeTeamName(raw);
    if (!key) return;
    const arr = map.get(key) ?? [];
    if (!arr.includes(entry)) arr.push(entry);
    map.set(key, arr);
  };
  for (const e of index) {
    add(e.name, e);
    add(e.popularName, e);
    add(e.officialName, e);
    for (const a of e.aliases ?? []) add(a, e);
    add(e.qid, e);
  }
  return map;
}

export interface TeamResolution {
  club: ClubIndexEntry | null;
  matches: ClubIndexEntry[];
  reasonCode: ReasonCode | null;
  details: Record<string, unknown>;
}

/** Resolve um time do fixture contra o índice de clubes ativos. */
export function mapTeamToClub(teamName: string, index: ClubIndexEntry[]): TeamResolution {
  const key = normalizeTeamName(teamName);
  if (!key) {
    return { club: null, matches: [], reasonCode: 'missing_club', details: { teamName } };
  }
  const matches = buildClubIndex(index).get(key) ?? [];
  if (matches.length === 0) {
    return { club: null, matches, reasonCode: 'missing_club', details: { teamName, key } };
  }
  const active = matches.filter((m) => m.active);
  if (matches.length > 1 && active.length !== 1) {
    return {
      club: null,
      matches,
      reasonCode: 'ambiguous_club',
      details: { teamName, key, candidates: matches.map((m) => m.qid) },
    };
  }
  if (active.length === 0) {
    return {
      club: null,
      matches,
      reasonCode: 'club_inactive',
      details: { teamName, key, candidates: matches.map((m) => m.qid) },
    };
  }
  return { club: active[0], matches: active, reasonCode: null, details: { teamName, key } };
}
