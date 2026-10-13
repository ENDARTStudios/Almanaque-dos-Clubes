import { describe, it, expect } from 'vitest';
import {
  resolveRsssfTeam,
  RSSSF_TEAM_ABSENT,
  tokenVariants,
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
  club('c6', 'América Futebol Clube', 'BR', { qid: 'Q338285' }),
  club('c9', 'Santos F.C.', 'BR'),
  club('c7', 'América Futebol Clube', 'BR', { qid: 'Q482251', city: 'Morrinhos' }),
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
  it('resolve por contenção com fronteira de palavra', () => {
    const r = resolveRsssfTeam('Santos', opts(['BR']));
    expect(r.club?.name).toBe('Santos F.C.');
    expect(r.via).toBe('containment');
  });

  it('o alias de homônimo vence a contenção (Palmeiras de SP, não o de Pato Branco)', () => {
    const r = resolveRsssfTeam('Palmeiras', opts(['BR']));
    expect(r.club?.name).toBe('Sociedade Esportiva Palmeiras');
    expect(r.via).toBe('alias');
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

  it('desempata homônimo pelo QID do acervo (América/MG = Belo Horizonte)', () => {
    const r = resolveRsssfTeam('América/MG', opts(['BR']));
    expect(r.club?.id).toBe('c6');
    expect(r.club?.qid).toBe('Q338285');
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

  it('T538: a lista de ausentes ficou VAZIA — os clubes que faltavam foram ingeridos', () => {
    // T520 tirou Vasco/Chapecoense (gender errado); T538 tirou Monagas, Táchira,
    // Patronato, Independiente Petrolero, Sporting, Málaga e Paraná (ingeridos do
    // Wikidata, agora com alias determinístico). Não sobrou nenhum token bloqueado.
    expect([...RSSSF_TEAM_ABSENT]).toEqual([]);
  });

  it('T538: token de clube ingerido resolve por alias com QID (determinístico)', () => {
    const monagas: ClubCandidate = {
      id: 've1',
      name: 'Monagas Sport Club',
      country: 'VE',
      state: null,
      gender: 'men',
      qid: 'Q1636856',
      city: null,
    };
    const r = resolveRsssfTeam('Monagas SC', {
      globalPool: [monagas],
      countries: ['VE'],
      season: '2018',
    });
    expect(r.club?.name).toBe('Monagas Sport Club');
    expect(r.via).toBe('alias');
  });

  it('T538: `Paraná` deixou de casar o clube de Campo Mourão (alias com QID)', () => {
    const adap: ClubCandidate = {
      id: 'br1',
      name: 'Associação Desportiva Atlética do Paraná',
      country: 'BR',
      state: null,
      gender: 'men',
      qid: 'Q260834',
      city: 'Campo Mourão',
    };
    const parana: ClubCandidate = {
      id: 'br2',
      name: 'Paraná Clube',
      country: 'BR',
      state: null,
      gender: 'men',
      qid: 'Q838534',
      city: 'Curitiba',
    };
    const r = resolveRsssfTeam('Paraná', {
      globalPool: [adap, parana],
      countries: ['BR'],
      season: '2018',
    });
    expect(r.club?.qid).toBe('Q838534');
    expect(r.via).toBe('alias');
  });

  it('token sem candidato devolve null sem inventar (Sport United)', () => {
    const r = resolveRsssfTeam('Sport United', opts(['BR']));
    expect(r.club).toBeNull();
  });
});

describe('team-resolver T519 — variantes de token e pool sem país', () => {
  it('tira prefixo/sufixo de tipo do clube (CR Flamengo, Millonarios FC, Barcelona SC)', () => {
    expect(tokenVariants('cr flamengo')).toContain('flamengo');
    expect(tokenVariants('millonarios fc')).toContain('millonarios');
    expect(tokenVariants('barcelona sc')).toContain('barcelona');
    expect(tokenVariants('se palmeiras')).toContain('palmeiras');
  });

  it('o pool da temporada resolve clube com country nulo no acervo (Libertadores)', () => {
    // Vários clubes sul-americanos têm  null no acervo; o pool da
    // temporada não passa pelo filtro de país justamente por isso.
    const ldu: ClubCandidate = {
      id: 'L1',
      name: 'LDU Quito',
      country: null,
      state: null,
      gender: 'men',
      qid: null,
    };
    const r = resolveRsssfTeam('LDU Quito', {
      seasonPool: [ldu],
      globalPool: auditedClubs(),
      countries: ['EC'],
    });
    expect(r.club?.name).toBe('LDU Quito');
    expect(r.via).toBe('pool-exact');
  });
});

function auditedClubs(): ClubCandidate[] {
  return [];
}

describe('T529 — alias com temporada (mesmo token, clubes diferentes)', () => {
  const laPlata: ClubCandidate = {
    id: 'ar1',
    name: 'Estudiantes de La Plata',
    country: 'AR',
    state: null,
    gender: 'men',
    qid: 'Q214940',
    city: null,
  };

  it('`Estudiantes` resolve para La Plata nas temporadas em que é ele', () => {
    const r = resolveRsssfTeam('Estudiantes', {
      globalPool: [laPlata],
      countries: ['AR', 'VE'],
      season: '2015',
    });
    expect(r.club?.name).toBe('Estudiantes de La Plata');
    expect(r.via).toBe('alias');
  });

  it('em 2020 o alias é suspenso e o token cai na cascata (no acervo real: ambíguo -> gap)', () => {
    // O acervo tem mais de um clube que "contém" o token (Estudiantes de Medicina,
    // Club Sportivo Estudiantes), então sem o alias a cascata não decide — que é o
    // comportamento DESEJADO aqui: o clube certo (Mérida/VEN) não existe no acervo.
    const medicina: ClubCandidate = {
      id: 'pe1',
      name: 'Estudiantes de Medicina',
      country: 'PE',
      state: null,
      gender: 'men',
      qid: 'Q5401913',
      city: null,
    };
    const r = resolveRsssfTeam('Estudiantes', {
      globalPool: [laPlata, medicina],
      countries: ['AR', 'VE', 'PE'],
      season: '2020',
    });
    expect(r.club).toBeNull();
    expect(r.ambiguousWith.length).toBeGreaterThan(0);
  });
});
