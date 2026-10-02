import { describe, it, expect } from 'vitest';
import {
  decideClubUniqueness,
  normalizeClubContextKey,
} from '../../../src/modules/clubs/club-uniqueness.js';

// T448b-2f — validação contextual de unicidade. Puro.

const cand = (
  over: Partial<{ id: string; name: string; state: string | null; city: string | null }> = {},
) => ({
  id: 'c1',
  name: 'Vila Nova Futebol Clube',
  state: null as string | null,
  city: null as string | null,
  ...over,
});

describe('T448b-2f — normalizeClubContextKey', () => {
  it('remove acento/caixa/pontuação', () => {
    expect(normalizeClubContextKey('  Atlético-MG ')).toBe('atletico mg');
    expect(normalizeClubContextKey(null)).toBe('');
  });
});

describe('T448b-2f — decideClubUniqueness', () => {
  it('permite homônimos com state diferente (GO vs RN)', () => {
    const d = decideClubUniqueness(
      { name: 'Vila Nova Futebol Clube', country: 'BR', state: 'RN', city: 'Natal' },
      [cand({ state: 'GO', city: 'Goiânia' })],
    );
    expect(d.decision).toBe('allow');
  });

  it('permite homônimos com city diferente (mesmo state)', () => {
    const d = decideClubUniqueness({ name: 'X FC', country: 'BR', state: 'SP', city: 'Campinas' }, [
      cand({ name: 'X FC', state: 'SP', city: 'São Paulo' }),
    ]);
    expect(d.decision).toBe('allow');
  });

  it('bloqueia duplicata EXATA (todos iguais)', () => {
    const d = decideClubUniqueness(
      { name: 'Vila Nova Futebol Clube', country: 'BR', state: 'GO', city: 'Goiânia' },
      [cand({ state: 'GO', city: 'Goiânia' })],
    );
    expect(d.decision).toBe('block');
  });

  it('bloqueia quando ambos SEM state/city (redundante)', () => {
    const d = decideClubUniqueness({ name: 'Vila Nova Futebol Clube', country: 'BR' }, [cand()]);
    expect(d.decision).toBe('block');
  });

  it('ambíguo quando um lado define state/city e o outro não', () => {
    const d = decideClubUniqueness({ name: 'Vila Nova Futebol Clube', country: 'BR' }, [
      cand({ state: 'GO', city: 'Goiânia' }),
    ]);
    expect(d.decision).toBe('ambiguous');
  });

  it('ignora self no update (existingId)', () => {
    const d = decideClubUniqueness(
      {
        name: 'Vila Nova Futebol Clube',
        country: 'BR',
        state: 'GO',
        city: 'Goiânia',
        existingId: 'c1',
      },
      [cand({ state: 'GO', city: 'Goiânia' })],
    );
    expect(d.decision).toBe('allow');
  });

  it('ignora nome diferente', () => {
    const d = decideClubUniqueness({ name: 'Outro', country: 'BR' }, [cand()]);
    expect(d.decision).toBe('allow');
  });
});
