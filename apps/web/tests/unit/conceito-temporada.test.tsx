// @vitest-environment jsdom
/**
 * FICHA DA TEMPORADA no conceito FICHA — testes da composição extraída.
 *
 * O defeito que estes testes travam: a página tinha os tokens do sistema, mas não tinha
 * composição nenhuma de temporada — era um nome, duas datas e um botão. O quadro
 * app/temporada.png pede cabeçalho com número-âncora, faixa de métricas, competições da
 * temporada, classificação final, gráficos e linha do tempo.
 *
 * O risco oposto é "ficar igual ao desenho" inventando dado: o quadro usa 1.842 partidas,
 * 4.988 gols, 12,4 mi de público, 112 placares 0 a 0, 9 × 0, Liverpool e Premier League. Os
 * testes exigem que NADA disso apareça, que o público (sem dado por partida) não vire bloco,
 * e que "—" substitua o que a fonte não publica — inclusive "últimos 5", que não existe aqui.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import TemporadaFichaPageView from '@/components/conceito/temporada/TemporadaFichaPageView';
import { goalsByRound, pickSeasonRow } from '@/components/conceito/temporada/derive';
import { conceitoTemporadaStrings } from '@/i18n/wsConceitoTemporada';
import type {
  CompetitionSeasonRow,
  SeasonCompetition,
  SeasonMatch,
  SeasonSummary,
} from '@/components/conceito/temporada/types';

afterEach(cleanup);

const SEASON: SeasonSummary = {
  id: 'season-1',
  name: '2024-25',
  startDate: null,
  endDate: null,
  status: 'FINISHED',
};

const LIGA_REF = { id: 'liga', name: 'Liga Teste' };
const COPA_REF = { id: 'copa', name: 'Copa Teste' };

const ALFA = { id: 'alfa', name: 'Clube Alfa' };
const BETA = { id: 'beta', name: 'Clube Beta' };
const GAMA = { id: 'gama', name: 'Clube Gama' };
const DELTA = { id: 'delta', name: 'Clube Delta' };

const MATCHES: SeasonMatch[] = [
  {
    id: 'm1',
    date: '2024-08-10T00:00:00.000Z',
    round: '1',
    homeScore: 2,
    awayScore: 0,
    homeClub: ALFA,
    awayClub: BETA,
    competition: LIGA_REF,
  },
  {
    id: 'm2',
    date: '2024-08-11T00:00:00.000Z',
    round: '1',
    homeScore: 0,
    awayScore: 0,
    homeClub: GAMA,
    awayClub: DELTA,
    competition: LIGA_REF,
  },
  {
    id: 'm3',
    date: '2024-09-15T00:00:00.000Z',
    round: '2',
    homeScore: 5,
    awayScore: 0,
    homeClub: ALFA,
    awayClub: DELTA,
    competition: LIGA_REF,
  },
  {
    id: 'm4',
    date: '2024-09-16T00:00:00.000Z',
    round: '2',
    homeScore: 1,
    awayScore: 3,
    homeClub: BETA,
    awayClub: GAMA,
    competition: LIGA_REF,
  },
  {
    id: 'm5',
    date: '2024-10-01T00:00:00.000Z',
    round: '3',
    homeScore: 0,
    awayScore: 0,
    homeClub: BETA,
    awayClub: DELTA,
    competition: LIGA_REF,
  },
  {
    id: 'm6',
    date: '2024-10-02T00:00:00.000Z',
    round: '3',
    homeScore: 1,
    awayScore: 2,
    homeClub: ALFA,
    awayClub: GAMA,
    competition: LIGA_REF,
  },
  {
    id: 'm7',
    date: '2024-11-20T00:00:00.000Z',
    round: 'Final',
    homeScore: 2,
    awayScore: 1,
    homeClub: BETA,
    awayClub: ALFA,
    competition: COPA_REF,
  },
];

/** Tabela catalogada pela fonte: mesmos números da tabela derivada + 3 clubes sem partida. */
const STANDINGS = [
  {
    position: 1,
    clubId: 'gama',
    clubName: 'Clube Gama',
    played: 3,
    won: 2,
    drawn: 1,
    lost: 0,
    goalsFor: 5,
    goalsAgainst: 2,
    points: 7,
  },
  {
    position: 2,
    clubId: 'alfa',
    clubName: 'Clube Alfa',
    played: 3,
    won: 2,
    drawn: 0,
    lost: 1,
    goalsFor: 8,
    goalsAgainst: 2,
    points: 6,
  },
  {
    position: 3,
    clubId: 'delta',
    clubName: 'Clube Delta',
    played: 3,
    won: 0,
    drawn: 2,
    lost: 1,
    goalsFor: 0,
    goalsAgainst: 5,
    points: 2,
  },
  {
    position: 4,
    clubId: 'beta',
    clubName: 'Clube Beta',
    played: 3,
    won: 0,
    drawn: 1,
    lost: 2,
    goalsFor: 1,
    goalsAgainst: 5,
    points: 1,
  },
  {
    position: 5,
    clubId: 'epsilon',
    clubName: 'Clube Epsilon',
    played: 3,
    won: 0,
    drawn: 0,
    lost: 3,
    goalsFor: 0,
    goalsAgainst: 9,
    points: 0,
  },
  {
    position: 6,
    clubId: 'zeta',
    clubName: 'Clube Zeta',
    played: 3,
    won: 0,
    drawn: 0,
    lost: 3,
    goalsFor: 0,
    goalsAgainst: 9,
    points: 0,
  },
  {
    position: 7,
    clubId: 'eta',
    clubName: 'Clube Eta',
    played: 3,
    won: 0,
    drawn: 0,
    lost: 3,
    goalsFor: 0,
    goalsAgainst: 9,
    points: 0,
  },
];

const LIGA_SEASON: CompetitionSeasonRow = {
  season: '2024-25',
  standings: STANDINGS,
  topScorer: { name: 'Jogador Um', goals: 9 },
  champion: { id: 'gama', name: 'Clube Gama' },
};

const LIGA: SeasonCompetition = {
  id: 'liga',
  name: 'Liga Teste',
  type: 'LEAGUE',
  country: 'BR',
  season: LIGA_SEASON,
};

const COPA: SeasonCompetition = {
  id: 'copa',
  name: 'Copa Teste',
  type: 'CUP',
  country: null,
  season: null,
};

const MATCHES_HREF = '/matches?seasonId=season-1';

function renderView(overrides: Partial<Parameters<typeof TemporadaFichaPageView>[0]> = {}) {
  return render(
    <TemporadaFichaPageView
      locale="pt-br"
      season={SEASON}
      matches={MATCHES}
      declaredTotal={MATCHES.length}
      competitionDetails={[LIGA, COPA]}
      matchesHref={MATCHES_HREF}
      {...overrides}
    />,
  );
}

function rowsOf(testId: string): Element[] {
  const table = screen.getByTestId(testId).querySelector('table');
  return table ? [...table.querySelectorAll('tbody tr')] : [];
}

describe('TemporadaFichaPageView — composição do quadro temporada', () => {
  it('abre com um único h1 display "Temporada {rótulo}" e status no subtítulo', () => {
    const { container } = renderView();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Temporada 2024-25');
    expect(headings[0].className).toContain('font-heading');
    expect(container.textContent).toContain('Encerrada');
    expect(container.textContent).toContain('2 competições');
  });

  it('o número-âncora conta as rodadas da competição mais longa e as competições REAIS', () => {
    const { container } = renderView();
    // Liga Teste tem 3 rodadas; a copa tem 1 (Final). Rodada de competições diferentes NÃO
    // se somam — o cabeçalho fala de uma temporada, não de 3 + 1.
    const anchor = container.querySelector('[class*="text-5xl"][class*="text-primary-ink"]');
    expect(anchor?.textContent).toBe('3');
    expect(container.textContent).toContain('rodadas · 2 competições');
  });

  it('a faixa de métricas usa partidas reais — nunca os números ilustrativos do quadro', () => {
    const { container } = renderView();

    expect(screen.getByTestId('temporada-pillar-matches').textContent).toContain('7');
    expect(screen.getByTestId('temporada-pillar-goals').textContent).toContain('17');
    expect(screen.getByTestId('temporada-pillar-average').textContent).toContain('2,43');
    expect(screen.getByTestId('temporada-pillar-goalless').textContent).toContain('2');
    expect(screen.getByTestId('temporada-pillar-biggest-win').textContent).toContain('5 × 0');

    const pillars = screen.getByTestId('temporada-pillars').textContent ?? '';
    for (const illustrated of ['1.842', '4.988', '2,71', '12,4 mi', '112', '9 × 0']) {
      expect(pillars).not.toContain(illustrated);
      expect(container.textContent).not.toContain(illustrated);
    }
  });

  it('público não é métrica nem gráfico: o acervo não publica público por partida', () => {
    renderView();
    expect(screen.queryByText('Público')).toBeNull();
    expect(screen.queryByText(/Público por mês/)).toBeNull();
    expect(screen.getByTestId('temporada-provenance').textContent).toContain('não publica público');
  });

  it('competições da temporada mostram campeão, pontos, jogos e artilheiro catalogados', () => {
    renderView();
    const rows = rowsOf('temporada-competitions');
    expect(rows).toHaveLength(2);

    // Liga Teste: campeão/tabela/artilheiro vieram do resumo catalogado.
    expect(rows[0].textContent).toContain('Liga Teste');
    expect(rows[0].textContent).toContain('Clube Gama');
    expect(rows[0].textContent).toContain('Jogador Um · 9');
    // 7 pontos na tabela da fonte; 3 jogos do clube nas partidas da temporada.
    const cells = [...rows[0].querySelectorAll('td')].map((cell) => cell.textContent);
    expect(cells).toEqual(['Liga Teste', 'Clube Gama', '7', '3', 'Jogador Um · 9']);

    // Copa Teste: sem resumo catalogado, campeão de mata-mata NÃO é derivado por pontos.
    expect(rows[1].textContent).toContain('Copa Teste');
    expect(rows[1].textContent).toContain('—');
    // Nada de campeão ilustrativo do desenho.
    const section = screen.getByTestId('temporada-competitions').textContent ?? '';
    for (const illustrated of ['Liverpool', 'Barcelona', 'Botafogo', 'Premier League']) {
      expect(section).not.toContain(illustrated);
    }
  });

  it('classificação final usa a tabela publicada pela fonte, com as colunas do acervo', () => {
    renderView();
    const section = screen.getByTestId('temporada-standings');
    expect(section.textContent).toContain('Liga Teste · classificação final');
    expect(section.textContent).toContain('5 de 7 clubes');
    expect(section.textContent).toContain('publicada pela fonte');

    const rows = rowsOf('temporada-standings');
    expect(rows).toHaveLength(5);
    const primeira = [...rows[0].querySelectorAll('td')].map((cell) => cell.textContent);
    expect(primeira).toEqual(['1', 'Clube Gama', '3', '2', '1', '0', '+3', '7']);

    // "Últ. 5" e "%" não existem na fonte: não há coluna inventada.
    expect(section.textContent).not.toContain('Últ');
    expect(section.textContent).not.toContain('%');

    const link = section.querySelector('a[href="/competitions/liga?tab=temporadas"]');
    expect(link?.textContent).toContain('ver tabela completa');
  });

  it('sem tabela catalogada, a classificação é DERIVADA das partidas e o método é declarado', () => {
    renderView({ competitionDetails: [{ ...LIGA, season: null }, COPA] });
    const section = screen.getByTestId('temporada-standings');
    expect(section.textContent).toContain('calculada a partir das partidas');
    expect(section.textContent).not.toContain('publicada pela fonte');

    const rows = rowsOf('temporada-standings');
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('Clube Gama');
    const primeira = [...rows[0].querySelectorAll('td')].map((cell) => cell.textContent);
    expect(primeira).toEqual(['1', 'Clube Gama', '3', '2', '1', '0', '+3', '7']);

    // Sem tabela catalogada o destino é a lista real de partidas que gerou a tabela.
    const link = section.querySelector('a[href="/matches?seasonId=season-1&competitionId=liga"]');
    expect(link?.textContent).toContain('ver as partidas');
  });

  it('campeão derivado por pontos é declarado quando o resumo da competição não existe', () => {
    renderView({ competitionDetails: [{ ...LIGA, season: null }, COPA] });
    const section = screen.getByTestId('temporada-competitions');
    expect(section.textContent).toContain('Clube Gama');
    expect(section.textContent).toContain('Campeão por pontos');
  });

  it('gráficos só existem com série real: gols por rodada da liga e donut de resultados', () => {
    renderView();
    const charts = screen.getByTestId('temporada-charts');

    const ligaChart = screen.getByTestId('temporada-chart-rounds-liga');
    expect(ligaChart.querySelector('title')?.textContent).toBe('Gols por rodada · Liga Teste');
    // 3 rodadas · 2, 9 e 3 gols.
    const values = [...ligaChart.querySelectorAll('circle')].length;
    expect(values).toBe(3);
    // Média da COMPETIÇÃO (14 gols em 6 jogos), não a média da temporada inteira.
    expect(ligaChart.textContent).toContain('média de 2,33 por jogo');

    // A copa tem uma rodada só: sem série, sem gráfico — não inventamos linha de 1 ponto.
    expect(screen.queryByTestId('temporada-chart-rounds-copa')).toBeNull();

    const results = screen.getByTestId('temporada-chart-results');
    expect(results.querySelector('title')?.textContent).toBe('Resultados');
    expect(results.textContent).toContain('Vitória em casa');
    expect(results.textContent).toContain('Empate');
    expect(results.textContent).toContain('Vitória fora');
    // 3 vitórias em casa, 2 empates, 2 vitórias fora.
    expect(results.textContent).toContain('3');
    expect(results.textContent).toContain('2');

    expect(charts.textContent).not.toContain('Público');
  });

  it('linha do tempo mostra só marcos reais, em ordem cronológica e sem repetir jogo', () => {
    renderView();
    const items = screen.getAllByTestId(/temporada-milestone-/);
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('AGO');
    expect(items[0].textContent).toContain('Abertura');
    expect(items[1].textContent).toContain('SET');
    expect(items[1].textContent).toContain('Maior goleada');
    expect(items[1].textContent).toContain('Clube Alfa 5 × 0 Clube Delta');
    expect(items[2].textContent).toContain('NOV');
    expect(items[2].textContent).toContain('Encerramento');

    // A maior goleada também é o jogo de mais gols: entra uma vez só.
    expect(screen.getByTestId('temporada-timeline').textContent).not.toContain(
      'Jogo com mais gols',
    );
  });

  it('procedência declara contagem, lacunas e o corte de paginação', () => {
    renderView({ declaredTotal: 9 });
    const footer = screen.getByTestId('temporada-provenance');
    expect(footer.className).toContain('border-t');
    expect(footer.textContent).toContain('7 partidas com placar');
    expect(footer.textContent).toContain('A consulta devolveu 7 das 9 partidas');
    expect(footer.textContent).toContain('nunca zero');
    expect(footer.textContent).toContain('lacuna');
  });

  it('falha de consulta não vira zero: ErrorState com retry, sem métricas', () => {
    renderView({ matches: null, declaredTotal: null, competitionDetails: [] });
    expect(screen.queryByTestId('temporada-pillars')).toBeNull();
    expect(screen.queryByTestId('temporada-competitions')).toBeNull();
    expect(screen.queryByTestId('temporada-charts')).toBeNull();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Não foi possível consultar as partidas');
    expect(alert.querySelector('a')?.getAttribute('href')).toBe('/temporadas/season-1');
    // O cabeçalho continua: a temporada existe, o que falhou foi a consulta das partidas.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Temporada 2024-25');
  });

  it('temporada sem partida usa EmptyState — vazio declarado, não tabela de zeros', () => {
    renderView({ matches: [], declaredTotal: 0, competitionDetails: [] });
    expect(screen.queryByTestId('temporada-pillars')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Sem partidas catalogadas');
  });

  it('partida sem placar não entra nos agregados e a lacuna é declarada', () => {
    const semPlacar: SeasonMatch[] = [
      { ...MATCHES[0], id: 'x1', homeScore: null, awayScore: null },
      { ...MATCHES[1], id: 'x2', homeScore: null, awayScore: null },
    ];
    renderView({
      matches: semPlacar,
      declaredTotal: 2,
      competitionDetails: [{ ...LIGA, season: null }, COPA],
    });
    expect(screen.getByTestId('temporada-pillar-matches').textContent).toContain('2');
    expect(screen.queryByTestId('temporada-pillar-goals')).toBeNull();
    expect(screen.queryByTestId('temporada-pillar-goalless')).toBeNull();
    expect(screen.getByTestId('temporada-pillars').textContent).toContain('lacuna declarada');
    expect(screen.queryByTestId('temporada-charts')).toBeNull();
  });

  it('competição de liga sem resumo catalogado mostra "—" em vez de nome inventado', () => {
    renderView({
      competitionDetails: [
        { ...LIGA, season: { ...LIGA_SEASON, champion: null, topScorer: null } },
        COPA,
      ],
    });
    const rows = rowsOf('temporada-competitions');
    const cells = [...rows[0].querySelectorAll('td')].map((cell) => cell.textContent);
    // Campeão derivado por pontos (real), mas artilheiro não catalogado vira lacuna.
    expect(cells[1]).toBe('Clube Gama');
    expect(cells[4]).toBe('—');
  });
});

describe('TemporadaFichaPageView — i18n nos três idiomas', () => {
  it('pt-br, en-us e es-es têm h1 e cabeçalhos próprios (nada de literal no JSX)', () => {
    const expected = {
      'pt-br': { title: 'Temporada 2024-25', standings: 'classificação final' },
      'en-us': { title: 'Season 2024-25', standings: 'final standings' },
      'es-es': { title: 'Temporada 2024-25', standings: 'clasificación final' },
    } as const;

    for (const locale of ['pt-br', 'en-us', 'es-es'] as const) {
      const { unmount } = renderView({ locale });
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(expected[locale].title);
      expect(screen.getByTestId('temporada-standings').textContent).toContain(
        expected[locale].standings,
      );
      unmount();
    }
  });

  it('o módulo i18n cobre os três locales com as mesmas chaves', () => {
    const locales = ['pt-br', 'en-us', 'es-es'] as const;
    const flatten = (value: unknown, prefix = ''): string[] => {
      if (typeof value !== 'object' || value === null) return [prefix];
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        flatten(child, prefix ? prefix + '.' + key : key),
      );
    };
    const keys = flatten(conceitoTemporadaStrings['pt-br']).sort();
    for (const locale of locales) {
      expect(flatten(conceitoTemporadaStrings[locale]).sort()).toEqual(keys);
    }
    expect(conceitoTemporadaStrings['en-us'].metrics.matches).toBe('Matches');
    expect(conceitoTemporadaStrings['es-es'].metrics.matches).toBe('Partidos');
  });
});

describe('goalsByRound — só rodada numerada vira série de "gols por rodada"', () => {
  it('ordena a rodada como número e soma os gols reais de cada uma', () => {
    const series = goalsByRound(MATCHES, 'liga');
    expect(series?.points.map((point) => point.label)).toEqual(['1', '2', '3']);
    // rodada 1: 2+0 e 0+0 = 2 · rodada 2: 5+0 e 1+3 = 9 · rodada 3: 0+0 e 1+2 = 3
    expect(series?.points.map((point) => point.value)).toEqual([2, 9, 3]);
    expect(series?.best).toEqual({ label: '2', value: 9 });
    expect(series?.rounds).toBe(3);
  });

  it('fase de copa (grupo/mata-mata) não é rodada: a série não existe', () => {
    const copa = MATCHES.filter((match) => match.competition?.id === 'copa');
    expect(goalsByRound(copa, 'copa')).toBeNull();
  });
});

describe('pickSeasonRow — casa o resumo catalogado com a temporada da página', () => {
  const rows: CompetitionSeasonRow[] = [
    { ...LIGA_SEASON, season: '2024/25' },
    { ...LIGA_SEASON, season: '2023/24' },
  ];

  it('casa pelo rótulo exato', () => {
    expect(pickSeasonRow(rows, '2024/25')?.season).toBe('2024/25');
  });

  it('casa por separador normalizado quando não há rótulo exato', () => {
    expect(pickSeasonRow(rows, '2023-24')?.season).toBe('2023/24');
  });

  it('não casa por aproximação de ano: temporada fora da lista vira lacuna', () => {
    expect(pickSeasonRow(rows, '2022/23')).toBeNull();
  });
});
