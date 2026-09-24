/**
 * T448b-2b FASE 1 — Extração do campeão por FAMÍLIA de frases + cross-check com a tabela.
 * PURO. Regras (R2): múltiplos campeões BLOQUEIAM; conflito frase×tabela BLOQUEIA;
 * frase-sozinha sem tabela é aceita se a página declarar campeão explicitamente;
 * posição 1 sozinha (sem marca explícita) NÃO é assumida como campeã.
 */
import type { ParsedTable, ParseWarning, ReasonCode } from './types.js';
import { normalizeTeamName } from './map-team-to-club.js';

export interface ChampionEvidence {
  phraseChampions: string[];
  phraseText: string | null;
  tableChampion: string | null;
  tableChampionAnnotated: boolean;
  warnings: ParseWarning[];
}

export interface ChampionResult {
  championTeam: string | null;
  reasonCode: ReasonCode | null;
  evidence: ChampionEvidence;
}

// Família 1 — negrito RSSSF: "** <Time> are <...> champions <...> **"
const BOLD_RE = /\*{2,}\s*([^*\n]+?)\s+are\b[^*\n]*?champions?[^*\n]*?\*{2,}/gi;
// Família 2 — PT explícito (fixtures sintéticas): "Campeão: X", "Campeões: X e Y"
const PT_LIST_RE = /(?:^|\n)\s*campe[\p{L}]*\s*:\s*([^\n]+)/giu;
const PT_TITULO_RE = /t[íi]tulo\s+para\s+([^\n,.;]+)/gi;
const PT_E_O_RE = /([\p{Lu}][\p{L}\s.'-]{1,60}?)\s+[éèe]\s+o\s+campe[\p{L}]*/giu;

function splitList(raw: string): string[] {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s*,\s*|\s+e\s+|\s*&\s*|\s*\/\s*|\s+and\s+/i)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 1);
}

function collect(text: string): { teams: string[]; texts: string[] } {
  const teams: string[] = [];
  const texts: string[] = [];
  const push = (raw: string) => {
    texts.push(raw.replace(/\s+/g, ' ').trim());
    for (const t of splitList(raw)) teams.push(t);
  };
  for (const m of text.matchAll(BOLD_RE)) push(m[1]);
  for (const m of text.matchAll(PT_LIST_RE)) push(m[1]);
  for (const m of text.matchAll(PT_TITULO_RE)) push(m[1]);
  for (const m of text.matchAll(PT_E_O_RE)) push(m[1]);
  return { teams, texts };
}

/** Extrai evidências (frase + tabela), sem reconciliar ainda. */
export function extractStateChampion(table: ParsedTable, text: string): ChampionEvidence {
  const warnings: ParseWarning[] = [];
  const { teams, texts } = collect(text);

  // dedup por chave normalizada, preservando a grafia de exibição
  const seen = new Set<string>();
  const phraseChampions: string[] = [];
  for (const t of teams) {
    const key = normalizeTeamName(t);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    phraseChampions.push(t);
  }

  const pos1 = table.rows.find((r) => r.position === 1) ?? null;
  const tableChampion = pos1 ? pos1.team : null;
  const tableChampionAnnotated = pos1 ? /champion/i.test(pos1.raw) : false;

  if (table.warnings.some((w) => w.code === 'malformed_table')) {
    warnings.push({ code: 'malformed_table', message: 'tabela inconsistente' });
  }

  return {
    phraseChampions,
    phraseText: texts.length ? texts.join(' | ') : null,
    tableChampion,
    tableChampionAnnotated,
    warnings,
  };
}

/**
 * Reconcilia frase × tabela e decide o campeão (ou o bloqueio).
 * Cross-check OBRIGATÓRIO quando ambos existem.
 */
export function reconcileChampion(evidence: ChampionEvidence): ChampionResult {
  const { phraseChampions, tableChampion, tableChampionAnnotated } = evidence;

  if (phraseChampions.length > 1) {
    return { championTeam: null, reasonCode: 'multiple_champions', evidence };
  }

  if (phraseChampions.length === 1) {
    const phrase = phraseChampions[0];
    if (tableChampion) {
      if (normalizeTeamName(phrase) !== normalizeTeamName(tableChampion)) {
        return { championTeam: null, reasonCode: 'conflicting_champion', evidence };
      }
      return { championTeam: phrase, reasonCode: null, evidence };
    }
    // frase existe, mas não há tabela → aceita (página declara o campeão).
    return { championTeam: phrase, reasonCode: null, evidence };
  }

  // Sem frase explícita.
  if (tableChampion && tableChampionAnnotated) {
    return { championTeam: tableChampion, reasonCode: null, evidence };
  }
  return { championTeam: null, reasonCode: 'champion_unconfirmed', evidence };
}

/** Atalho: extrai + reconcilia. */
export function extractStateChampionResolved(table: ParsedTable, text: string): ChampionResult {
  return reconcileChampion(extractStateChampion(table, text));
}
