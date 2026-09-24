import { describe, it, expect } from 'vitest';
import { decodeLegacyTable } from '../../../src/lib/rsssf/decode-legacy-table.js';
import {
  extractStateChampion,
  extractStateChampionResolved,
} from '../../../src/lib/rsssf/extract-state-champion.js';

// T448b-2b FASE 1 — campeão por família de frases + cross-check. Sem rede.

const tbl = (s: string) => decodeLegacyTable(s);
const TABLE_ATLETICO = '1.Atlético 15 10 4 1 28-9 34 Champions';

describe('T448b-2b FASE 1 — campeão: frase + tabela', () => {
  it('T1 — frase negrito + tabela consistentes => campeão', () => {
    const r = extractStateChampionResolved(
      tbl(TABLE_ATLETICO),
      `${TABLE_ATLETICO}\n** Atlético are Minas Gerais champions of 2023 **`,
    );
    expect(r.championTeam).toBe('Atlético');
    expect(r.reasonCode).toBeNull();
  });

  it('T2 — variantes PT: "Título para X"', () => {
    const r = extractStateChampionResolved(tbl(TABLE_ATLETICO), 'Título para Atlético');
    expect(r.championTeam).toBe('Atlético');
  });

  it('T2 — variantes PT: "X é o campeão"', () => {
    const r = extractStateChampionResolved(tbl(TABLE_ATLETICO), 'Atlético é o campeão mineiro');
    expect(r.championTeam).toBe('Atlético');
  });

  it('frase sozinha (sem tabela) é aceita se explícita', () => {
    const r = extractStateChampionResolved(
      tbl(''),
      '** Cruzeiro are Minas Gerais champions of 2019 **',
    );
    expect(r.championTeam).toBe('Cruzeiro');
    expect(r.reasonCode).toBeNull();
  });

  it('T3 — conflito frase×tabela => conflicting_champion', () => {
    const r = extractStateChampionResolved(tbl(TABLE_ATLETICO), 'Campeão: Cruzeiro');
    expect(r.championTeam).toBeNull();
    expect(r.reasonCode).toBe('conflicting_champion');
  });

  it('T4 — múltiplos campeões => multiple_champions (não muta QID)', () => {
    const r = extractStateChampionResolved(tbl(TABLE_ATLETICO), 'Campeões: Atlético e Cruzeiro');
    expect(r.championTeam).toBeNull();
    expect(r.reasonCode).toBe('multiple_champions');
  });

  it('só posição 1 sem marca explícita => champion_unconfirmed (não assume)', () => {
    const r = extractStateChampionResolved(
      tbl('1.Atlético 15 10 4 1 28-9 34'),
      TABLE_ONLY_PLACEHOLDER(),
    );
    expect(r.championTeam).toBeNull();
    expect(r.reasonCode).toBe('champion_unconfirmed');
  });

  it('tabela anotada "Champions" na posição 1 => aceita pela tabela', () => {
    const r = extractStateChampionResolved(
      tbl('1.Atlético 15 10 4 1 28-9 34 Champions'),
      '1.Atlético 15 10 4 1 28-9 34 Champions',
    );
    expect(r.championTeam).toBe('Atlético');
    expect(r.reasonCode).toBeNull();
  });

  it('evidência expõe frase, tabela e anotação', () => {
    const ev = extractStateChampion(
      tbl(TABLE_ATLETICO),
      '** Atlético are Minas Gerais champions of 2023 **',
    );
    expect(ev.phraseChampions).toEqual(['Atlético']);
    expect(ev.tableChampion).toBe('Atlético');
    expect(ev.tableChampionAnnotated).toBe(true);
  });
});

function TABLE_ONLY_PLACEHOLDER(): string {
  return 'Minas Gerais State Championship 2025 - Final classification';
}
