import { describe, it, expect } from 'vitest';
import {
  resolveRsssfTeam,
  RSSSF_TEAM_ABSENT,
  type ClubCandidate,
} from '../../../src/lib/rsssf/team-resolver.js';

// T519 — o resolver é a barreira entre o nome que a RSSSF imprime e o clube do
// acervo. Nada de score fuzzy: igualdade normalizada, alias curado, contenção com
// fronteira de palavra e casamento por abreviação — sempre exigindo UNICIDADE.

const club = (
  id: string,
  name: string,
  country: string,
  extra: Partial<ClubCandidate> = {},
): ClubCandidate => ({
  id,
  name,
  country,
  state: null,
  gender: 'men',
  qid: null,
  city: null,
  ...extra,
});

const BR = [
  club('c1', 'Sociedade Esportiva Palmeiras', 'BR'),
  club('c2', 'Atlético-MG', 'BR'),
  club('c3', 'Club Athletico Paranaense', 'BR'),
  club('c4', 'Red Bull Bragantino', 'BR'),
  club('c5', 'Red Bull Bragantino II', 'BR'),
  club('c6', 'América Futebol Clube', 'BR', { city: 'Belo Horizonte' }),
  club('c7', 'América Futebol Clube', 'BR', { city: 'Morrinhos' }),
  club('c8', 'Ceará Sporting Club', 'BR', { gender: 'women' }),
];
const GB = [
  club('e1', 'Manchester City F.C.', 'GB'),
  club('e2', 'Manchester United F.C.', 'GB'),
  club('e3', 'Liverpool F.C.', 'GB'),
  club('e4', 'Wolverhampton Wanderers F.C.', 'GB'),
];
const UY = [club('u1', 'Liverpool Fútbol Club', 'UY')];

const all = [...BR, ...GB, ...UY];
const opts = (countries: string[]) => ({ globalPool: all, countries });

describe('team-resolver T519', () => {
  it('resolven por contenção com fronteira de palavra', () => {
    const r = resolveRsssfTeam('Palmeiras', opts(['BR']));
    expect(r.club?.name).toBe('Sociedade Esportiva Palmeiras');
    expect(r.via).toBe('containment');
  });

  it('resolvem pelo alias curado quando o acervo usa outro nome (Atlético-MG)', () => {
    for (const token of ['Atlético/MG', 'Atlético Mineiro', 'CA Mineiro']) {
      const r = resolveRsssfTeam(token, opts(['BR']));
      expect(r.via).toBe('alias');
      expect(r.club?.name).toBe('Atlético-MG');
    }
  });

  it('o alias evita casar com o TIME B (Bragantino x Red Bull Bragantino II)', () => {
    const r = resolveRsssfTeam('Bragantino', opts(['BR']));
    expect(r.club?.name).toBe('Red Bull Bragantino');
    // Sem o alias, "bragantino" casaria com os dois e seria corretamente ambíguo.
    expect(r.club?.name).not.toContain('II');
  });

  it('desempata homônimo pelo discriminador de cidade (América/MG)', () => {
    const r = resolveRsssfTeam('América/MG', opts(['BR']));
    expect(r.club?.id).toBe('c6');
    expect(r.club?.city).toBe('Belo Horizonte');
  });

  it('resolve abreviação de coluna fixa (Manchester C / Sheffield U)', () => {
    expect(resolveRsssfTeam('Manchester C', opts(['GB'])).club?.name).toBe('Manchester City F.C.');
    expect(resolveRsssfTeam('Manchester U', opts(['GB'])).club?.name).toBe(
      'Manchester United F.C.',
    );
    expect(resolveRsssfTeam('Wolverhampton', opts(['GB'])).club?.name).toBe(
      'Wolverhampton Wanderers F.C.',
    );
  });

  it('o escopo de país desempata clubes homônimos entre países', () => {
    expect(resolveRsssfTeam('Liverpool', opts(['UY'])).club?.name).toBe('Liverpool Fútbol Club');
    expect(resolveRsssfTeam('Liverpool', opts(['GB'])).club?.name).toBe('Liverpool F.C.');
    // Sem escopo, os dois aparecem → ambíguo → não resolve (nunca chuta).
    const semEscopo = resolveRsssfTeam('Liverpool', opts([]));
    expect(semEscopo.club).toBeNull();
    expect(semEscopo.ambiguousWith).toHaveLength(2);
  });

  it('nunca casa com clube feminino (escopo de gênero)', () => {
    const r = resolveRsssfTeam('Ceará', { globalPool: [BR[7]], countries: ['BR'] });
    expect(r.club).toBeNull();
  });

  it('clubes ausentes do acervo ficam declaradamente sem resolução', () => {
    for (const t of ['Chapecoense', 'Patronato']) {
      expect(RSSSF_TEAM_ABSENT.has(t)).toBe(true);
      const r = resolveRsssfTeam(t, opts(['BR']));
      expect(r.club).toBeNull();
      expect(r.via).toBeNull();
    }
  });

  it('token sem candidato devolve null sem inventar (Sport United)', () => {
    const r = resolveRsssfTeam('Sport United', opts(['BR']));
    expect(r.club).toBeNull();
  });
});
