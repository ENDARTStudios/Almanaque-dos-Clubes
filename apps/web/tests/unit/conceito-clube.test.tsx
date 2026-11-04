// @vitest-environment jsdom
/**
 * FICHA DE CLUBE no conceito FICHA — testes da composição extraída.
 *
 * O defeito que estes testes travam: a ficha tinha os tokens e os componentes do sistema, mas
 * continuava com a composição antiga (cartões `rounded-2xl`, tabela por competição+temporada em
 * linha corrida). O quadro `clube-migrado` pede cabeçalho de ficha, faixa de pilares, tabela densa
 * por competição, parede de honrarias e elenco.
 *
 * O risco oposto é "ficar igual ao desenho" inventando dado: o quadro usa 48 títulos, 426 jogos,
 * 812 gols, 28 jogadores e nomes como Fluminense. Os testes exigem que NADA disso apareça e que
 * "—" substitua a fonte ausente (idade, estatística de jogador, licença de escudo).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import ClubeFichaPageView from '@/components/conceito/clube/ClubeFichaPageView';
import { conceitoClubeStrings } from '@/i18n/wsConceitoClube';
import type {
  Anthem,
  ClubProfile,
  ClubStatistics,
  KitEntry,
  SquadPlayer,
} from '@/components/conceito/clube/types';

afterEach(cleanup);

const CLUB: ClubProfile = {
  id: 'clube-teste',
  qid: 'Q123',
  name: 'Clube de Teste',
  fullName: 'Clube de Teste de Futebol',
  shortName: 'CTF',
  fansCount: 40988,
  website: null,
  infobox: { estadio: 'Estádio do Teste', capacidade: '50.000' },
  editorial: {
    license: 'CC BY-SA 4.0',
    pt: {
      extract: 'O Clube de Teste nasceu como clube de remo e chegou ao futebol em 1912.',
      sourceUrl: 'https://pt.wikipedia.org/wiki/Clube_de_Teste',
    },
  },
  socialLinks: null,
  followersSnapshot: null,
  status: 'active',
  gender: 'men',
  country: 'BR',
  state: 'RJ',
  city: 'Rio de Janeiro',
  foundedYear: 1895,
  geo: {
    latitude: -22.9121,
    longitude: -43.2302,
    coordSource: 'wikidata',
    coordPrecision: 'municipality',
    attribution: { geo: 'GeoNames', source: 'https://example.org/geo', license: 'CC BY 4.0' },
  },
  provenance: {
    source: 'wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q123',
    importedFrom: 'wikidata-p54',
    retrievedAt: '2026-10-01T00:00:00.000Z',
  },
  titles: {
    available: true,
    items: [
      {
        year: 1980,
        season: '1980',
        competition: { id: 'brasileirao', name: 'Brasileirão' },
        hierarchy: 'nacional',
        gender: 'men',
        sourceUrl: 'https://www.wikidata.org/wiki/Q999',
      },
      {
        year: 2020,
        season: '2020',
        competition: { id: 'brasileirao', name: 'Brasileirão' },
        hierarchy: 'nacional',
        gender: 'men',
        sourceUrl: 'https://www.wikidata.org/wiki/Q999',
      },
      {
        year: 2019,
        season: '2019',
        competition: { id: 'libertadores', name: 'Copa Libertadores' },
        hierarchy: 'continental',
        gender: 'men',
        sourceUrl: 'https://www.wikidata.org/wiki/Q998',
      },
    ],
    limitations: [],
  },
  rankings: {
    available: true,
    items: [
      {
        rankingId: 'ranking-1',
        rankingName: 'Ranking de Clubes',
        scope: null,
        season: '2025',
        competitionId: null,
        competitionName: null,
        position: 3,
        points: 88,
        publishedAt: '2025-12-01T00:00:00.000Z',
      },
    ],
    limitations: [],
  },
  competitions: {
    available: true,
    items: [{ id: 'brasileirao', qid: null, name: 'Brasileirão', type: 'nacional', country: 'BR' }],
    limitations: [],
  },
  related: { available: false, items: [], limitations: [] },
  gaps: ['squad_not_available', 'kits_not_available', 'anthem_not_available'],
  media: {
    logoUrl: null,
    teamColors: null,
    stadium: { name: 'Estádio do Teste', image: null, capacity: 50000 },
  },
};

const STATS: ClubStatistics = {
  overall: {
    played: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 18,
    goalsAgainst: 9,
    goalDiff: 9,
    points: 20,
    home: { played: 5, wins: 4, draws: 1, losses: 0, goalsFor: 11, goalsAgainst: 3 },
    away: { played: 5, wins: 2, draws: 1, losses: 2, goalsFor: 7, goalsAgainst: 6 },
  },
  byCompetition: [
    {
      competitionId: 'brasileirao',
      competitionName: 'Brasileirão',
      season: '2024',
      played: 5,
      wins: 3,
      draws: 1,
      losses: 1,
      goalsFor: 9,
      goalsAgainst: 4,
      points: 10,
    },
    {
      competitionId: 'brasileirao',
      competitionName: 'Brasileirão',
      season: '2023',
      played: 5,
      wins: 3,
      draws: 1,
      losses: 1,
      goalsFor: 9,
      goalsAgainst: 5,
      points: 10,
    },
    {
      competitionId: 'copa',
      competitionName: null,
      season: '2022',
      played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goalsFor: 3,
      goalsAgainst: 3,
      points: 3,
    },
  ],
  topRivals: [
    {
      opponentId: 'rival-1',
      opponentName: 'Rival Um',
      played: 12,
      wins: 5,
      draws: 4,
      losses: 3,
      goalsFor: 18,
      goalsAgainst: 15,
    },
  ],
  opponents: 1,
};

const KITS: KitEntry[] = [
  {
    season: '2025',
    type: 'home',
    label: '2025 · Casa',
    parts: {
      body: { pattern: null, color: 'c8102e', file: null, fileUrl: null, license: null },
      leftarm: { pattern: null, color: 'c8102e', file: null, fileUrl: null, license: null },
      rightarm: { pattern: null, color: 'c8102e', file: null, fileUrl: null, license: null },
      shorts: { pattern: null, color: '000000', file: null, fileUrl: null, license: null },
      socks: { pattern: null, color: '000000', file: null, fileUrl: null, license: null },
    },
    sourceUrl: 'https://example.org/kit',
  },
];

const SQUAD: SquadPlayer[] = [
  {
    id: 'jogador-1',
    fullName: 'Jogador Real',
    shortName: null,
    birthDate: '1990-01-01',
    country: 'BR',
    position: 'FORWARD',
  },
  {
    id: 'jogador-2',
    fullName: 'Jogador Sem Data',
    shortName: null,
    birthDate: null,
    country: 'BR',
    position: null,
  },
];

const ANTHEM: Anthem = {
  composer: null,
  lyricist: null,
  year: null,
  official: true,
  label: 'Hino oficial',
  note: null,
  audioUrl: null,
  audioLicense: null,
  audioSourceUrl: null,
  lyrics: null,
  lyricsRestricted: true,
  sourceUrl: 'https://example.org/anthem',
  attribution: 'pt.Wikipédia (CC BY-SA 4.0)',
};

function renderView(overrides: Partial<Parameters<typeof ClubeFichaPageView>[0]> = {}) {
  return render(
    <ClubeFichaPageView
      locale="pt-br"
      club={CLUB}
      stats={STATS}
      kits={KITS}
      anthem={ANTHEM}
      pennants={null}
      crests={[]}
      squad={SQUAD}
      timeline={null}
      relatedClubs={null}
      {...overrides}
    />,
  );
}

describe('ClubeFichaPageView — composição do quadro clube-migrado', () => {
  it('abre com kicker de localização, um único h1 display e subtítulo com fundação/estádio', () => {
    const { container } = renderView();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Clube de Teste');
    expect(headings[0].className).toContain('font-heading');
    expect(container.textContent).toContain('Clube · Rio de Janeiro · RJ');
    expect(container.textContent).toContain('Fundado em 1895');
    expect(container.textContent).toContain('Estádio do Teste');
    expect(container.textContent).toContain('40.988 torcedores');
  });

  it('escudo sem imagem declara ilustração autoral (nunca apresenta desenho como oficial)', () => {
    renderView();
    expect(screen.getByTestId('club-crest-fallback')).toBeTruthy();
    expect(screen.getByTestId('club-crest-illustration').textContent).toContain('escudo oficial');
  });

  it('a faixa de pilares usa números reais do acervo', () => {
    renderView();
    expect(screen.getByTestId('club-pillar-titles').textContent).toContain('3');
    expect(screen.getByTestId('club-pillar-matches').textContent).toContain('10');
    expect(screen.getByTestId('club-pillar-goals').textContent).toContain('18');
    expect(screen.getByTestId('club-pillar-founded').textContent).toContain('1895');
    // O desenho usa 48 / 426 / 812; nada disso pode vazar.
    const pillars = screen.getByTestId('club-pillars').textContent ?? '';
    expect(pillars).not.toContain('48');
    expect(pillars).not.toContain('426');
    expect(pillars).not.toContain('812');
  });

  it('Sobre o clube mostra o extrato real e linka a fonte', () => {
    renderView();
    const about = screen.getByTestId('club-about');
    expect(about.textContent).toContain('nasceu como clube de remo');
    expect(about.querySelector('a')?.getAttribute('href')).toBe(
      'https://pt.wikipedia.org/wiki/Clube_de_Teste',
    );
  });

  it('estatística por competição agrega temporadas e calcula aproveitamento real', () => {
    renderView();
    const table = screen.getByTestId('club-stats-by-competition');
    const linhaBrasileirao = table.querySelectorAll('tbody tr')[0];
    // 10 jogos (5+5), 6V (3+3), 14 gols pró (9+5), aproveitamento 20/(10*3)=67%.
    expect(linhaBrasileirao.textContent).toContain('Brasileirão');
    expect(linhaBrasileirao.textContent).toContain('10');
    expect(linhaBrasileirao.textContent).toContain('67%');
    // Competição sem nome não vira nome inventado: coluna mostra "—".
    const semNome = table.querySelectorAll('tbody tr')[1];
    expect(semNome.textContent).toContain('—');
    // A tabela geral/casa/fora preserva os dados do endpoint.
    expect(screen.getByTestId('club-stats-overall').textContent).toContain('Casa');
  });

  it('parede de honrarias agrupa por competição, mostra anos e mantém a fonte por aresta', () => {
    renderView();
    const gallery = screen.getByTestId('club-honour-gallery');
    const rows = screen.getAllByTestId('club-honour-title');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Brasileirão');
    expect(rows[0].textContent).toContain('2');
    expect(rows[0].textContent).toContain('1980 · 2020');
    expect(gallery.textContent).toContain('3 títulos · 2 competições');
    expect(gallery.querySelector('a[href*="wikidata.org"]')).toBeTruthy();
  });

  it('elenco mostra jogador, posição e idade derivada — e declara a lacuna de jogos/gols', () => {
    renderView();
    const rows = screen.getAllByTestId('club-squad-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Jogador Real');
    expect(rows[0].textContent).toContain('Atacante');
    // Idade é DERIVADA de birthDate: número inteiro, nunca texto inventado.
    const ageCell = rows[0].querySelectorAll('td')[2];
    expect(ageCell.textContent).toMatch(/^\d{2}$/);
    // Sem birthDate: "—" declarado, nunca uma idade estimada.
    expect(rows[1].querySelectorAll('td')[2].textContent).toBe('—');
    // O quadro pede Jogos/Gols por jogador; a API não publica — a lacuna é declarada.
    expect(screen.getByTestId('club-squad').textContent).toContain('lacuna declarada');
    expect(screen.getByTestId('club-squad').textContent).not.toContain('28 jogadores');
  });

  it('uniformes mostram a cor real declarada na fonte', () => {
    renderView();
    expect(screen.getByTestId('kit-label').textContent).toContain('2025 · Titular');
    const card = screen.getByTestId('club-kit-card');
    expect(card.textContent).toContain('#C8102E');
    expect(card.textContent).toContain('#000000');
  });

  it('hino entra sem letra (licença restrita) e com a atribuição real', () => {
    renderView();
    const anthem = screen.getByTestId('club-anthem');
    expect(anthem.textContent).toContain('Hino oficial');
    expect(screen.getByTestId('anthem-lyrics-note')).toBeTruthy();
    expect(anthem.querySelector('a')?.getAttribute('href')).toBe('https://example.org/anthem');
  });

  it('procedência no pé declara fonte, contagem e o significado do "—"', () => {
    renderView();
    const footer = screen.getByTestId('club-provenance');
    expect(footer.className).toContain('border-t');
    expect(footer.textContent).toContain('Títulos conferidos');
    expect(footer.textContent).toContain('3 conquistas');
    expect(footer.textContent).toContain('lacuna declarada');
  });

  it('não renderiza bloco sem dado (rivais vazios, sem uniformes, sem elenco, sem escudo)', () => {
    renderView({
      stats: { ...STATS, topRivals: [] },
      kits: null,
      squad: null,
      anthem: null,
      crests: [],
    });
    expect(screen.queryByTestId('club-rivals')).toBeNull();
    expect(screen.queryByTestId('club-kits')).toBeNull();
    expect(screen.queryByTestId('club-squad')).toBeNull();
    expect(screen.queryByTestId('club-anthem')).toBeNull();
    expect(screen.queryByTestId('club-honour-gallery')).toBeTruthy();
  });

  it('falha de estatística não vira zero: bloco de estatística some', () => {
    renderView({ stats: null });
    expect(screen.queryByTestId('club-statistics')).toBeNull();
    expect(screen.queryByTestId('club-pillar-matches')).toBeNull();
  });

  it('as lacunas preenchidas saem da lista (elenco/uniformes/hino presentes)', () => {
    renderView();
    const gaps = screen.queryByTestId('club-gaps');
    // squad_not_available, kits_not_available e anthem_not_available foram preenchidos.
    expect(gaps?.textContent ?? '').not.toContain('Elenco');
    expect(gaps?.textContent ?? '').not.toContain('Uniformes');
    expect(gaps?.textContent ?? '').not.toContain('Hino');
  });
});

describe('ClubeFichaPageView — i18n nos três idiomas', () => {
  it('pt-br, en-us e es-es têm headings próprios (nada de literal no JSX)', () => {
    const expected = {
      'pt-br': { stats: 'Estatística por competição', honours: 'Parede de honrarias' },
      'en-us': { stats: 'Statistics by competition', honours: 'Honours wall' },
      'es-es': { stats: 'Estadística por competición', honours: 'Pared de honores' },
    } as const;

    for (const locale of ['pt-br', 'en-us', 'es-es'] as const) {
      const { unmount } = renderView({ locale });
      expect(screen.getByTestId('club-statistics').textContent).toContain(expected[locale].stats);
      expect(screen.getByTestId('club-honour-gallery').textContent).toContain(
        expected[locale].honours,
      );
      unmount();
    }
  });

  it('o módulo i18n cobre os três locales com as mesmas chaves', () => {
    const locales = ['pt-br', 'en-us', 'es-es'] as const;
    const flatten = (value: unknown, prefix = ''): string[] => {
      if (typeof value !== 'object' || value === null) return [prefix];
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        flatten(child, prefix ? `${prefix}.${key}` : key),
      );
    };
    const keys = flatten(conceitoClubeStrings['pt-br']).sort();
    for (const locale of locales) {
      expect(flatten(conceitoClubeStrings[locale]).sort()).toEqual(keys);
    }
    expect(conceitoClubeStrings['en-us'].honours.heading).toBe('Honours wall');
    expect(conceitoClubeStrings['es-es'].honours.heading).toBe('Pared de honores');
  });
});
