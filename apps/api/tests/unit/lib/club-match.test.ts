import { describe, it, expect } from 'vitest';
import {
  normalizeClubName,
  isJunkClubName,
  NAME_ALIASES,
} from '../../../src/lib/wikipedia/club-match.js';

// T510 — casamento de nome Wikipedia → acervo. A normalização precisa tornar
// iguais grafias que só diferem por tipo societário/idioma, sem colidir clubes
// distintos.

describe('normalizeClubName', () => {
  it('remove tokens de tipo e acentos (mesma chave para grafias equivalentes)', () => {
    expect(normalizeClubName('Manchester City F.C.')).toBe('manchestercity');
    expect(normalizeClubName('Manchester City')).toBe('manchestercity');
    expect(normalizeClubName('Real Madrid C. F.')).toBe('realmadrid');
    expect(normalizeClubName('Real Madrid Club de Fútbol')).toBe('realmadrid');
    expect(normalizeClubName('AC Milan')).toBe('milan');
    expect(normalizeClubName('São Paulo FC')).toBe('saopaulo');
  });

  it('NÃO colide clubes distintos', () => {
    expect(normalizeClubName('Inter Milan')).not.toBe(normalizeClubName('AC Milan'));
    expect(normalizeClubName('Manchester City')).not.toBe(normalizeClubName('Manchester United'));
  });

  it('descarta anos (fundação) do nome', () => {
    expect(normalizeClubName('Alba Roma 1907')).toBe('albaroma');
  });
});

describe('isJunkClubName', () => {
  it('reconhece o ruído de importação (não é clube)', () => {
    expect(isJunkClubName('AC Milan and the Italian national football team')).toBe(true);
    expect(isJunkClubName('Juventus F.C. and the Italian national football team')).toBe(true);
    expect(isJunkClubName('AC Milan')).toBe(false);
    expect(isJunkClubName('Inter Milan')).toBe(false);
  });
});

describe('NAME_ALIASES', () => {
  it('mapeia a grafia curta europeia para a do acervo', () => {
    expect(NAME_ALIASES.Inter).toBe('Inter Milan');
    expect(NAME_ALIASES.Milan).toBe('AC Milan');
    expect(NAME_ALIASES['Botafogo de Futebol e Regatas']).toBe('Botafogo F.R.');
    // T514 — artefato da fonte (template cru na célula da Primeira Liga 2021-22)
    expect(NAME_ALIASES['Predefinição:Futebol B-SAD']).toBe('B-SAD');
  });
});
