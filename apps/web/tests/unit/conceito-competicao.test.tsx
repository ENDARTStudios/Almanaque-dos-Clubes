// @vitest-environment jsdom
/**
 * /competitions/[id] no conceito FICHA — testes da composição e do contrato real.
 *
 * O defeito que estes testes travam: a página tinha os tokens do sistema, mas a composição
 * continuava a antiga (cabeçalho com cartão `rounded-2xl shadow-md`, tabela em `rounded-xl`) e
 * a classificação não era a TABELA DENSA do quadro `app/tabela.png`.
 *
 * O risco oposto é "ficar igual ao desenho" inventando dado. O quadro desenha 38 rodadas,
 * 84 pontos, +45 de saldo, a coluna "Últ. 5" e a legenda Champions/Europa/Rebaixamento. Nada
 * disso pode aparecer: a API não publica forma, nem zonas, nem critérios de desempate do
 * regulamento. Os testes exigem que a lacuna seja DECLARADA e que "—" substitua o que falta.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'pt-br' }) }),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// O botão de favoritar é Client Component e exige `I18nProvider`; a página o recebe como slot.
vi.mock('@/components/FavoriteButton', () => ({
  default: ({ targetId }: { targetId?: string }) => (
    <button type="button" data-testid={`favorite-competition-${targetId}`}>
      favoritar
    </button>
  ),
}));

import CompetitionDetailPage from '@/app/competitions/[id]/page';
import CompeticaoHeader from '@/components/conceito/competicao/CompeticaoHeader';
import TabelaClassificacao from '@/components/conceito/competicao/TabelaClassificacao';
import Criterios from '@/components/conceito/competicao/Criterios';
import Procedencia from '@/components/conceito/competicao/Procedencia';
import {
  goalDifferenceOf,
  latestSeasonWithStandings,
  normalizeHistoryTable,
  normalizeStandings,
  roundsFromStandings,
  type ClassificationRow,
} from '@/components/conceito/competicao/derive';
import type { SeasonStandingRow } from '@/components/conceito/competicao/types';
import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import { conceitoCompeticaoStrings } from '@/i18n/wsConceitoCompeticao';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Tabela catalogada de teste — números próprios, nenhum copiado do quadro. */
const STANDINGS: SeasonStandingRow[] = [
  {
    position: 1,
    clubName: 'Clube Alfa',
    clubId: 'clube-alfa',
    matchedName: 'Clube Alfa',
    played: 10,
    won: 7,
    drawn: 2,
    lost: 1,
    goalsFor: 21,
    goalsAgainst: 8,
    points: 23,
  },
  {
    position: 2,
    clubName: 'Clube Beta',
    clubId: 'clube-beta',
    matchedName: null,
    played: 10,
    won: 6,
    drawn: 2,
    lost: 2,
    goalsFor: 18,
    goalsAgainst: 11,
    points: 20,
  },
  {
    position: 3,
    clubName: 'Clube Gama',
    clubId: null,
    matchedName: null,
    played: 10,
    won: null,
    drawn: null,
    lost: null,
    goalsFor: null,
    goalsAgainst: null,
    points: null,
  },
];

const HISTORY_ROWS = [
  {
    clubId: 'clube-alfa',
    clubName: 'Clube Alfa',
    position: 1,
    played: 30,
    wins: 18,
    draws: 6,
    losses: 6,
    goalsFor: 55,
    goalsAgainst: 30,
    goalDifference: 25,
    points: 60,
  },
  {
    clubId: 'clube-beta',
    clubName: null,
    position: 2,
    played: 30,
    wins: 15,
    draws: 7,
    losses: 8,
    goalsFor: 47,
    goalsAgainst: 39,
    goalDifference: 8,
    points: 52,
  },
];

const COMP = {
  id: 'comp-1',
  name: 'Liga de Teste',
  gender: 'men',
  country: 'BR',
  type: 'LEAGUE',
  level: 1,
  fansCount: 120,
  qid: 'Q100',
  trophyImageUrl: null,
};

const SEASON_2025 = {
  season: '2025',
  standings: STANDINGS,
  topScorer: { name: 'Artilheiro Teste', goals: 9 },
  sourceUrl: 'https://example.org/tabela-2025',
  championId: 'clube-alfa',
  runnerUpId: 'clube-beta',
  champion: { id: 'clube-alfa', name: 'Clube Alfa' },
  runnerUp: { id: 'clube-beta', name: 'Clube Beta' },
  third: { clubId: null, clubName: 'Clube Gama' },
  totalMatches: 30,
  totalGoals: 72,
};

const SEASON_2024 = {
  season: '2024',
  standings: null,
  topScorer: null,
  sourceUrl: null,
  championId: null,
  runnerUpId: null,
  champion: null,
  runnerUp: null,
  third: null,
  totalMatches: null,
  totalGoals: null,
};

const PAYLOAD = {
  data: COMP,
  overview: {
    editions: [{ year: 2025, champion: { id: 'clube-alfa', name: 'Clube Alfa' } }],
    topWinners: [{ clubId: 'clube-alfa', name: 'Clube Alfa', titles: 3 }],
    participants: [{ id: 'clube-alfa', name: 'Clube Alfa', city: 'Cidade Teste', country: 'BR' }],
    totalEditions: 12,
    history: {
      firstEditionYear: 1990,
      lastEditionYear: 2025,
      editionsCount: 12,
      editionsWithChampion: 12,
      status: 'vigente' as const,
      biggestChampion: { clubId: 'clube-alfa', clubName: 'Clube Alfa', titles: 3 },
      longestStreak: { clubName: 'Clube Alfa', from: 2020, to: 2022 },
    },
    podium: {
      champion: { clubId: 'clube-alfa', clubName: 'Clube Alfa' },
      runnerUp: { clubId: 'clube-beta', clubName: 'Clube Beta' },
      third: null,
    },
    totals: { matches: 30, goals: 72 },
  },
  seasons: [SEASON_2025, SEASON_2024],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Histórico derivado das partidas (`GET /competitions/:id/history`). */
const HISTORY = {
  table: HISTORY_ROWS,
  records: {
    biggestWin: {
      date: '2025-05-01T00:00:00.000Z',
      season: '2025',
      round: '5',
      homeClubName: 'Clube Alfa',
      awayClubName: 'Clube Beta',
      homeScore: 4,
      awayScore: 0,
      margin: 4,
      goals: 4,
      winnerName: 'Clube Alfa',
      loserName: 'Clube Beta',
    },
    highestScoring: {
      date: '2025-06-01T00:00:00.000Z',
      season: '2025',
      round: '7',
      homeClubName: 'Clube Alfa',
      awayClubName: 'Clube Gama',
      homeScore: 4,
      awayScore: 3,
      margin: 1,
      goals: 7,
      winnerName: 'Clube Alfa',
      loserName: 'Clube Gama',
    },
    matchesUsed: 30,
    totalGoals: 72,
    goalsPerMatch: 2.4,
    goallessDraws: 3,
  },
  champions: [{ season: '2025', clubId: 'clube-alfa', clubName: 'Clube Alfa', points: 60 }],
  seasons: ['2025'],
  rounds: 10,
  matchesUsed: 30,
  truncated: false,
  pointsPerWin: 3,
  pointsRuleNote: 'Vitória = 3 pontos neste recorte.',
};

function mockApiWithHistory() {
  global.fetch = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes('/competitions/comp-1/history')) return jsonResponse({ data: HISTORY });
    if (url.includes('/competitions/comp-1/rounds')) return jsonResponse({ data: null });
    if (url.includes('/competitions/comp-1')) return jsonResponse(PAYLOAD);
    return jsonResponse({ data: null });
  }) as unknown as typeof fetch;
}

function mockApi(handler?: (url: string) => Response | null) {
  global.fetch = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes('/competitions/comp-1/history')) {
      return jsonResponse({ data: null });
    }
    if (url.includes('/competitions/comp-1/rounds')) {
      return jsonResponse({ data: null });
    }
    if (handler) {
      const custom = handler(url);
      if (custom) return custom;
    }
    if (url.includes('/competitions/comp-1')) return jsonResponse(PAYLOAD);
    return jsonResponse({ data: null });
  }) as unknown as typeof fetch;
}

async function renderPage(searchParams: { tab?: string; season?: string } = {}) {
  const ui = await CompetitionDetailPage({
    params: Promise.resolve({ id: 'comp-1' }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(ui);
}

function renderStandings(locale: 'pt-br' | 'en-us' | 'es-es' = 'pt-br') {
  const s = conceitoCompeticaoStrings[locale];
  return render(
    <TabelaClassificacao
      rows={normalizeStandings(STANDINGS)}
      locale={locale}
      competitionName="Liga de Teste"
      season="2025"
      kind="standings"
      s={s}
      testId="tabela-teste"
      rowTestId="linha-teste"
    />,
  );
}

function table() {
  return screen.getByTestId('tabela-teste');
}

describe('CompeticaoHeader — a primeira dobra do quadro tabela', () => {
  const props = {
    locale: 'pt-br' as const,
    kicker: 'Competição · Brasil',
    name: 'Liga de Teste',
    subtitle: 'Classificação de 2025, edições e maiores campeões.',
    anchor: '10',
    anchorLabel: 'rodadas · 2025',
    countryCode: 'BR',
    internationalLabel: 'Competição internacional',
    genderLabel: 'Futebol feminino',
    levelLabel: 'Nível 1',
    trophyImageUrl: null,
    trophyIllustrationNote: 'Taça ilustrada — o acervo não tem imagem oficial do troféu.',
  };

  it('abre pelo kicker e por UM h1 de display, com a âncora e seu rótulo', () => {
    render(<CompeticaoHeader {...props} />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Liga de Teste');
    expect(headings[0].className).toContain('font-heading');
    expect(screen.getByTestId('competicao-kicker').textContent).toBe('Competição · Brasil');
    const header = screen.getByTestId('competicao-header');
    expect(header.textContent).toContain('10');
    expect(header.textContent).toContain('rodadas · 2025');
  });

  it('o país é navegação real para a listagem filtrada, e gênero/nível são metadado', () => {
    render(<CompeticaoHeader {...props} />);
    const header = screen.getByTestId('competicao-header');
    const link = header.querySelector('a[href="/competitions?country=BR"]');
    expect(link).not.toBeNull();
    expect(header.textContent).toContain('Futebol feminino');
    expect(header.textContent).toContain('Nível 1');
  });

  it('sem imagem oficial, a taça é DECLARADA ilustração (testids antigos preservados)', () => {
    render(<CompeticaoHeader {...props} />);
    expect(screen.queryByTestId('competition-trophy')).toBeNull();
    expect(screen.getByTestId('competition-trophy-illustration')).not.toBeNull();
    expect(screen.getByTestId('competition-trophy-note').textContent).toContain('ilustrada');
  });

  it('sem âncora verificada, o cabeçalho não inventa número', () => {
    render(<CompeticaoHeader {...props} anchor={undefined} anchorLabel={undefined} />);
    const header = screen.getByTestId('competicao-header');
    expect(header.textContent).not.toContain('rodadas · 2025');
  });
});

describe('TabelaClassificacao — a tabela densa do conceito', () => {
  it('tem exatamente as colunas com dado: #, clube, J, V, E, D, GP, GC, SG, Pts', () => {
    renderStandings();
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['#', 'Clube', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts']);
  });

  it('NÃO desenha "Últ. 5" — a fonte não publica forma', () => {
    renderStandings();
    expect(within(table()).queryByText('Últ. 5')).toBeNull();
    expect(table().textContent).not.toContain('Últ. 5');
  });

  it('desenha a coluna de forma SOMENTE quando a linha traz o dado', () => {
    const rows: ClassificationRow[] = [
      { ...normalizeStandings(STANDINGS)[0], form: ['V', 'V', 'E', 'V', 'D'] },
    ];
    const s = conceitoCompeticaoStrings['pt-br'];
    render(
      <TabelaClassificacao
        rows={rows}
        locale="pt-br"
        competitionName="Liga de Teste"
        season="2025"
        kind="standings"
        s={s}
        testId="tabela-teste"
        rowTestId="linha-teste"
      />,
    );
    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toContain('Últ. 5');
    expect(table().textContent).toContain('V V E V D');
  });

  it('número à direita com tabular-nums, saldo com sinal e lacuna "—" (nunca zero)', () => {
    renderStandings();
    const rows = screen.getAllByTestId('linha-teste');
    expect(rows).toHaveLength(3);

    const cells = within(rows[0]).getAllByRole('cell');
    // #, clube, J, V, E, D, GP, GC, SG, Pts
    expect(cells.map((cell) => cell.textContent)).toEqual([
      '1',
      'Clube Alfa',
      '10',
      '7',
      '2',
      '1',
      '21',
      '8',
      '+13',
      '23',
    ]);
    for (const index of [0, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(cells[index].className).toContain('tabular-nums');
      expect(cells[index].className).toContain('text-right');
    }

    const semDado = within(screen.getAllByTestId('linha-teste')[2]).getAllByRole('cell');
    expect(semDado[2].textContent).toBe('10');
    expect(semDado[3].textContent).toBe('—');
    expect(semDado[8].textContent).toBe('—');
    expect(semDado[9].textContent).toBe('—');
    expect(semDado[9].textContent).not.toBe('0');
  });

  it('clube com id vira link; clube sem id continua texto (nada de link quebrado)', () => {
    renderStandings();
    const rows = screen.getAllByTestId('linha-teste');
    expect(within(rows[0]).getByRole('link', { name: 'Clube Alfa' }).getAttribute('href')).toBe(
      '/clubs/clube-alfa',
    );
    expect(within(rows[1]).getByRole('link', { name: 'Clube Beta' })).not.toBeNull();
    expect(within(rows[2]).queryByRole('link')).toBeNull();
  });

  it('a tabela rolável é alcançável por teclado e tem legenda acessível', () => {
    renderStandings();
    const region = table();
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-label')).toContain('Liga de Teste');
    expect(region.querySelector('caption')?.textContent).toContain('2025');
    // O cabeçalho de 9px é abreviado; o <abbr> leva a palavra inteira ao leitor de tela.
    const headers = within(region).getAllByRole('columnheader');
    expect(headers[2].getAttribute('abbr')).toBe('Jogos');
    expect(headers[8].getAttribute('abbr')).toBe('Saldo de gols');
  });
});

describe('TabelaClassificacao — tabela derivada das partidas', () => {
  it('mapeia a tabela histórica e marca a diferença de gols calculada pela API', () => {
    const s = conceitoCompeticaoStrings['pt-br'];
    render(
      <TabelaClassificacao
        rows={normalizeHistoryTable(HISTORY_ROWS)}
        locale="pt-br"
        competitionName="Liga de Teste"
        kind="history"
        s={s}
        testId="tabela-teste"
        rowTestId="linha-teste"
      />,
    );
    const rows = screen.getAllByTestId('linha-teste');
    expect(rows).toHaveLength(2);
    const cells = within(rows[0]).getAllByRole('cell');
    expect(cells[0].textContent).toBe('1');
    expect(cells[1].textContent).toBe('Clube Alfa');
    expect(cells[8].textContent).toBe('+25');
    expect(cells[9].textContent).toBe('60');
    // Nome ausente na origem vira lacuna declarada, nunca nome inventado.
    expect(within(rows[1]).getAllByRole('cell')[1].textContent).toBe('—');
    expect(table().textContent).toContain('calculada a partir das partidas do acervo');
  });
});

describe('Criterios — desempate declarado, não copiado do desenho', () => {
  it('declara que a ordem é a da fonte e que a regra de desempate é lacuna', () => {
    const s = conceitoCompeticaoStrings['pt-br'];
    render(
      <Criterios
        testId="criterios-teste"
        title={s.criteria.title}
        items={[s.criteria.sourceOrder, s.tables.goalDifferenceNote, s.criteria.zonesGap]}
      />,
    );
    const block = screen.getByTestId('criterios-teste');
    expect(block.textContent).toContain('posição publicada pela fonte');
    expect(block.textContent).toContain('SG = GP − GC');
    expect(block.textContent).toContain('legenda de zonas não é desenhada');
    // A frase do quadro ("Pontos → saldo → gols pró") NÃO é a regra de uma tabela catalogada.
    expect(block.textContent).not.toContain('pontos → saldo de gols');
  });

  it('na tabela derivada a regra é conhecida, porque é o código que ordena', () => {
    const s = conceitoCompeticaoStrings['pt-br'];
    render(
      <Criterios
        testId="criterios-teste"
        title={s.criteria.title}
        items={[s.criteria.derivedOrder]}
      />,
    );
    expect(screen.getByTestId('criterios-teste').textContent).toContain(
      'pontos → saldo de gols → gols pró',
    );
  });
});

describe('Procedencia — fonte secundária no pé', () => {
  it('declara a tabela publicada, as lacunas e a regra do "—"', () => {
    const s = conceitoCompeticaoStrings['pt-br'];
    render(<Procedencia s={s} season="2025" hasDerived={false} />);
    const footer = screen.getByTestId('competicao-provenance');
    expect(footer.className).toContain('border-t');
    expect(footer.textContent).toContain('tabela publicada pela fonte');
    expect(footer.textContent).toContain('nunca zero');
    expect(footer.textContent?.toLowerCase()).toContain('lacuna');
  });

  it('sem classificação catalogada, a procedência declara a ausência', () => {
    const s = conceitoCompeticaoStrings['pt-br'];
    render(<Procedencia s={s} season={null} hasDerived={false} />);
    expect(screen.getByTestId('competicao-provenance').textContent).toContain(
      'não tem classificação por temporada catalogada',
    );
  });
});

describe('derive — as decisões de dado ficam fora do JSX', () => {
  it('a última temporada com tabela é a primeira da lista (ordem desc) que tem linhas', () => {
    expect(
      latestSeasonWithStandings([
        { season: '2025', standings: null },
        { season: '2024', standings: STANDINGS },
        { season: '2023', standings: STANDINGS },
      ])?.season,
    ).toBe('2024');
    expect(latestSeasonWithStandings([{ season: '2025', standings: null }])).toBeNull();
  });

  it('rodadas = maior nº de jogos por clube; sem coluna publicada, 0 (sem âncora)', () => {
    expect(roundsFromStandings(STANDINGS)).toBe(10);
    expect(roundsFromStandings([{ ...STANDINGS[0], played: null }])).toBe(0);
    expect(roundsFromStandings([])).toBe(0);
  });

  it('saldo é aritmética de GP−GC, e ausência de gol não vira zero', () => {
    expect(goalDifferenceOf(21, 8)).toBe(13);
    expect(goalDifferenceOf(8, 21)).toBe(-13);
    expect(goalDifferenceOf(null, 8)).toBeNull();
    expect(goalDifferenceOf(8, null)).toBeNull();
  });
});

describe('/competitions/[id] — o payload real alimenta a ficha', () => {
  it('cabeçalho, âncora de rodadas e abas preservadas', async () => {
    mockApi();
    await renderPage();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Liga de Teste');
    expect(screen.getByTestId('competicao-kicker').textContent).toBe('Competição · Brasil');
    const header = screen.getByTestId('competicao-header');
    expect(header.textContent).toContain('10');
    expect(header.textContent).toContain('rodadas · 2025');

    // Todas as abas originais continuam existindo (Pontuação só quando há partidas).
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Temporadas',
      'Visão Geral',
      'Edições',
      'Clubes',
      'Maiores Campeões',
    ]);
  });

  it('a aba Visão Geral preserva ficha técnica, pódio, história e métricas', async () => {
    mockApi();
    const { container } = await renderPage({ tab: 'visao' });

    const overview = screen.getByTestId('competition-insights');
    expect(overview.textContent).toContain('Ficha da competição');
    expect(overview.textContent).toContain('Clube Alfa');
    expect(overview.textContent).toContain('País');
    // O nível é metadado do CABEÇALHO (chip), não da ficha técnica da aba.
    expect(screen.getByTestId('competicao-header').textContent).toContain('Nível 1');
    expect(screen.getAllByTestId('history-stat').length).toBeGreaterThan(0);
    expect(screen.getByTestId('competition-totals').textContent).toContain('30');

    // JSON-LD preservado.
    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(ld?.textContent).toContain('SportsEvent');
    expect(ld?.textContent).toContain('Liga de Teste');
  });

  it('a aba Temporadas apresenta a classificação na TABELA DENSA do conceito', async () => {
    mockApi();
    await renderPage({ tab: 'temporadas' });

    const region = screen.getByTestId('competition-standings-table-2025');
    const headers = within(region)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['#', 'Clube', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts']);
    expect(within(region).queryByText('Últ. 5')).toBeNull();

    const rows = within(region).getAllByTestId('competition-standings-row');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Clube Alfa');
    expect(within(rows[0]).getByRole('link').getAttribute('href')).toBe('/clubs/clube-alfa');

    // Nada do quadro foi copiado: sem 38 rodadas, sem 84 pontos, sem legenda de zonas.
    expect(region.textContent).not.toContain('84');
    expect(region.textContent).not.toContain('+45');
    expect(region.textContent).not.toContain('Champions League');

    expect(screen.getByTestId('competition-standings-criteria').textContent).toContain(
      'posição publicada pela fonte',
    );
    expect(screen.getByTestId('seasons-summary-table')).not.toBeNull();
    expect(
      screen.getByTestId('season-2025').querySelector('a[href="https://example.org/tabela-2025"]'),
    ).not.toBeNull();
  });

  it('temporada sem tabela catalogada usa vazio honesto — nada derivado de partidas', async () => {
    mockApi();
    await renderPage({ tab: 'temporadas', season: '2024' });

    const empty = screen.getByTestId('season-standings-empty-2024');
    expect(empty.textContent).toContain('Classificação em catalogação');
    expect(empty.textContent).toContain('não foi catalogada');
    expect(screen.queryByTestId('competition-standings-table-2024')).toBeNull();
  });

  it('a aba Pontos corridos preserva métricas/recordes e usa a tabela densa', async () => {
    mockApiWithHistory();
    await renderPage({ tab: 'pontuacao' });

    expect(screen.getByTestId('competition-points')).not.toBeNull();
    expect(screen.getByTestId('record-biggest-win').textContent).toContain('Clube Alfa');
    expect(screen.getByTestId('record-highest-scoring').textContent).toContain('7');

    const region = screen.getByTestId('competition-history-table');
    expect(
      within(region)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['#', 'Clube', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts']);
    const rows = within(region).getAllByTestId('competition-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Clube Alfa');
    expect(within(region).queryByText('Últ. 5')).toBeNull();

    // A regra de ordenação da tabela derivada é a do código, então é declarada.
    expect(screen.getByTestId('competition-history-criteria').textContent).toContain(
      'pontos → saldo de gols → gols pró',
    );
    // A aba passa a existir quando há partidas com placar.
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toContain('Pontos corridos');
  });

  it('falha de origem vira DetailUnavailable — nunca 404 falso', async () => {
    global.fetch = vi.fn(
      async () => new Response('{"error":"INTERNAL"}', { status: 500 }),
    ) as unknown as typeof fetch;
    const ui = await CompetitionDetailPage({
      params: Promise.resolve({ id: 'comp-1' }),
      searchParams: Promise.resolve({}),
    });
    expect(ui.type).toBe(DetailUnavailable);
  });

  it('404 da origem vira notFound()', async () => {
    global.fetch = vi.fn(
      async () => new Response('{"error":"NOT_FOUND"}', { status: 404 }),
    ) as unknown as typeof fetch;
    await expect(
      CompetitionDetailPage({
        params: Promise.resolve({ id: 'comp-1' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('i18n — os três idiomas cobrem a mesma árvore', () => {
  it('pt-br, en-us e es-es têm as mesmas chaves', () => {
    const flatten = (value: unknown, prefix = ''): string[] => {
      if (typeof value !== 'object' || value === null) return [prefix];
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        flatten(child, prefix ? prefix + '.' + key : key),
      );
    };
    const keys = flatten(conceitoCompeticaoStrings['pt-br']).sort();
    for (const locale of ['en-us', 'es-es'] as const) {
      expect(flatten(conceitoCompeticaoStrings[locale]).sort()).toEqual(keys);
    }
  });

  it('as colunas da tabela são traduzidas (nada de literal no JSX)', () => {
    expect(conceitoCompeticaoStrings['en-us'].tables.columns.club).toBe('Club');
    expect(conceitoCompeticaoStrings['es-es'].tables.columns.club).toBe('Club');
    expect(conceitoCompeticaoStrings['en-us'].tables.columns.goalDifference).toBe('GD');
    expect(conceitoCompeticaoStrings['es-es'].tables.columns.goalDifference).toBe('DG');
  });

  it('a tabela em en-us e es-es mantém as mesmas colunas reais', () => {
    for (const locale of ['en-us', 'es-es'] as const) {
      const { unmount } = renderStandings(locale);
      const headers = within(screen.getByTestId('tabela-teste'))
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent);
      expect(headers).toHaveLength(10);
      expect(headers).not.toContain('Últ. 5');
      unmount();
    }
  });
});
