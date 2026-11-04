// @vitest-environment jsdom
/**
 * O PANTEÃO NO CONCEITO FICHA — a única superfície escura do produto.
 *
 * O defeito que estes testes travam é o mesmo que a home travou no seu tempo: o site tinha
 * os tokens e os componentes do sistema, mas /legends continuava sendo a composição antiga
 * (tabela clara, cartões rounded-xl) em vez do quadro escuro `app/lendas.png`.
 *
 * O outro risco é o oposto: "ficar igual ao desenho" inventando dado. O quadro desenha
 * Pelé/Maradona/Messi e gráficos de carreira que `GET /legends` não publica. Os testes
 * exigem que esses nomes NÃO apareçam, que o "—" declarado substitua a fonte ausente, e que
 * falha de rede seja ErrorState (não EmptyState, não zero).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import LendasPageView from '@/components/conceito/lendas/LendasPageView';
import type { LegendsCounts, LegendsSummary } from '@/components/conceito/lendas/types';
import { conceitoLendasStrings } from '@/i18n/wsConceitoLendas';

afterEach(cleanup);

const SUMMARY: LegendsSummary = {
  topChampions: {
    items: [
      {
        clubId: 'real-madrid',
        clubName: 'Real Madrid',
        country: 'ES',
        titles: 14,
        lastTitleYear: 2024,
      },
      {
        clubId: 'milan',
        clubName: 'Milan',
        country: 'IT',
        titles: 7,
        lastTitleYear: 2007,
      },
      {
        clubId: 'bayern',
        clubName: 'Bayern de Munique',
        country: 'DE',
        titles: 6,
        lastTitleYear: 2020,
      },
      {
        clubId: 'barcelona',
        clubName: 'Barcelona',
        country: 'ES',
        titles: 5,
        lastTitleYear: 2015,
      },
      {
        clubId: 'santos',
        clubName: 'Santos',
        country: 'BR',
        titles: 3,
        lastTitleYear: null,
      },
    ],
    provenance: { source: 'knowledge-graph:WON', titlesCounted: 2046 },
  },
  competitionLeaders: {
    items: [
      {
        competitionId: 'uefa-champions-league',
        competitionName: 'UEFA Champions League',
        competitionType: 'CONTINENTAL',
        leaderClubId: 'real-madrid',
        leaderClubName: 'Real Madrid',
        titles: 14,
        lastTitleYear: 2024,
      },
      {
        competitionId: 'copa-libertadores',
        competitionName: 'Copa Libertadores',
        competitionType: 'CONTINENTAL',
        leaderClubId: 'independiente',
        leaderClubName: 'Independiente',
        titles: 7,
        lastTitleYear: 1984,
      },
    ],
    provenance: { source: 'knowledge-graph:WON', competitionsConsidered: 12 },
  },
  records: {
    biggestWin: {
      matchId: 'match-1',
      homeClubId: 'casa',
      homeClubName: 'Casa FC',
      awayClubId: 'fora',
      awayClubName: 'Fora FC',
      homeScore: 9,
      awayScore: 0,
      margin: 9,
      totalGoals: 9,
      date: '1950-06-25',
      competitionId: 'copa',
      competitionName: 'Copa do Mundo',
      seasonId: '1950',
      seasonName: '1950',
      sourceUrl: 'https://example.org/match/1',
    },
    mostGoalsMatch: {
      matchId: 'match-2',
      homeClubId: 'casa',
      homeClubName: 'Casa FC',
      awayClubId: 'fora',
      awayClubName: 'Fora FC',
      homeScore: 7,
      awayScore: 6,
      margin: 1,
      totalGoals: 13,
      date: '1960-01-01',
      competitionId: null,
      competitionName: null,
      seasonId: null,
      seasonName: null,
      sourceUrl: 'https://example.org/match/2',
    },
    mostGoalsClubSeason: {
      clubId: 'clube-gols',
      clubName: 'Clube dos Gols',
      seasonId: '2025',
      seasonName: '2025',
      goals: 91,
      matches: 38,
    },
    longestUnbeatenSeason: {
      clubId: 'clube-invicto',
      clubName: 'Clube Invicto',
      seasonId: '2024',
      seasonName: '2024',
      length: 38,
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
    },
    provenance: { source: 'matches', matchesConsidered: 17265 },
  },
};

const COUNTS: LegendsCounts = { players: 105211, clubs: 12017, countries: null };

function renderView(overrides: Partial<Parameters<typeof LendasPageView>[0]> = {}) {
  return render(
    <LendasPageView
      locale="pt-br"
      data={SUMMARY}
      counts={COUNTS}
      generatedAt="2026-11-03T12:00:00.000Z"
      {...overrides}
    />,
  );
}

describe('LendasPageView — composição do quadro escuro', () => {
  it('abre com a faixa theme-dark, kicker, título display e um único h1', () => {
    const { container } = renderView();
    const surface = screen.getByTestId('lendas-dark-surface');
    expect(surface.className).toContain('theme-dark');
    expect(surface.className).toContain('bg-background');

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Lendas e Imortais');
    expect(screen.getByTestId('lendas-kicker').textContent).toContain('Panteão');
    expect(container.textContent).toContain('clubes e competições');
    // O título é display de verdade (Barlow Condensed), não corpo.
    expect(headings[0].className).toContain('font-heading');
  });

  it('a faixa de métricas usa contagem real e declara "—" quando a origem falha', () => {
    renderView();
    expect(screen.getByTestId('lendas-metric-players').textContent).toBe('105.211');
    expect(screen.getByTestId('lendas-metric-clubs').textContent).toBe('12.017');
    expect(screen.getByTestId('lendas-metric-titles').textContent).toBe('2.046');
    expect(screen.getByTestId('lendas-metric-competitions').textContent).toBe('12');
    // countries === null na fixture: lacuna declarada, nunca 0.
    expect(screen.getByTestId('lendas-metric-countries').textContent).toBe('—');
    expect(screen.getByTestId('lendas-metric-countries').textContent).not.toBe('0');
  });

  it('os cartões de campeões mostram posição, títulos e último título — sem jogadores inventados', () => {
    const { container } = renderView();
    const cards = screen.getByTestId('lendas-champions');
    expect(cards.querySelectorAll('li')).toHaveLength(5);
    expect(cards.textContent).toContain('Real Madrid');
    expect(cards.textContent).toContain('14 títulos');
    expect(cards.textContent).toContain('último título: 2024');
    // Ano ausente na fonte vira "—", não um ano inventado.
    expect(cards.textContent).toContain('Santos');

    // O conceito desenha esses nomes; o payload NÃO os entrega. Não podem estar na tela.
    for (const invented of ['Pelé', 'Maradona', 'Messi', 'Beckenbauer', 'Ronaldo Nazário']) {
      expect(container.textContent).not.toContain(invented);
    }
    expect(cards.querySelector('a[href="/clubs/real-madrid"]')).toBeTruthy();
  });

  it('a lista densa tem número de posição, fio de 1px e os líderes reais', () => {
    renderView();
    const rows = screen.getAllByTestId('lendas-leader-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].className).toContain('border-b');
    expect(rows[0].className).toContain('border-border');
    expect(rows[0].textContent).toContain('1');
    expect(rows[0].textContent).toContain('UEFA Champions League');
    expect(rows[0].textContent).toContain('Real Madrid');
    expect(rows[0].textContent).toContain('14 títulos');
    expect(rows[0].querySelector('a[href="/competitions/uefa-champions-league"]')).toBeTruthy();
    expect(rows[0].querySelector('a[href="/clubs/real-madrid"]')).toBeTruthy();
  });

  it('os cartões de recorde trazem o número grande, o contexto e a fonte quando existe', () => {
    renderView();
    const biggest = screen.getByTestId('lendas-record-biggest-win');
    expect(biggest.textContent).toContain('Maior goleada');
    expect(biggest.textContent).toContain('9');
    expect(biggest.textContent).toContain('Casa FC');
    const source = screen.getByTestId('lendas-record-biggest-win-source');
    expect(source.querySelector('a')?.getAttribute('href')).toBe('https://example.org/match/1');

    expect(screen.getByTestId('lendas-record-most-goals-match').textContent).toContain('13');
    expect(screen.getByTestId('lendas-record-most-goals-club-season').textContent).toContain(
      'Clube dos Gols',
    );
    expect(screen.getByTestId('lendas-record-longest-unbeaten-season').textContent).toContain(
      'Clube Invicto',
    );
  });

  it('não renderiza bloco que a API não entregou (recordes nulos) nem bloco vazio', () => {
    renderView({
      data: {
        ...SUMMARY,
        topChampions: { ...SUMMARY.topChampions, items: [] },
        competitionLeaders: { ...SUMMARY.competitionLeaders, items: [] },
        records: {
          biggestWin: null,
          mostGoalsMatch: null,
          mostGoalsClubSeason: null,
          longestUnbeatenSeason: null,
          provenance: SUMMARY.records.provenance,
        },
      },
    });
    expect(screen.queryByTestId('lendas-champions')).toBeNull();
    expect(screen.queryByTestId('lendas-leaders')).toBeNull();
    expect(screen.queryByTestId('lendas-records')).toBeNull();
    // Sem nenhum bloco, o vazio é DECLARADO (EmptyState = role="status").
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('procedência no pé: fio, contagens por bloco e a declaração do "—"', () => {
    renderView();
    const footer = screen.getByTestId('lendas-provenance');
    expect(footer.className).toContain('border-t');
    expect(footer.textContent).toContain('2.046 arestas WON');
    expect(footer.textContent).toContain('12 competições');
    expect(footer.textContent).toContain('17.265 partidas');
    expect(footer.textContent).toContain('contagens diretas do acervo');
    expect(footer.textContent).toContain('lacuna declarada');
    expect(footer.textContent).toContain('Resumo gerado em');
  });
});

describe('LendasPageView — falha não é vazio', () => {
  it('data null renderiza ErrorState (role="alert"), não EmptyState, e não mostra métricas', () => {
    renderView({ data: null, generatedAt: null });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByTestId('lendas-metrics')).toBeNull();
    // O cabeçalho continua, então a página não fica em branco.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Lendas e Imortais');
  });

  it('resumo vazio mas com sucesso renderiza EmptyState (role="status") e métricas reais', () => {
    renderView({
      data: {
        ...SUMMARY,
        topChampions: { ...SUMMARY.topChampions, items: [] },
        competitionLeaders: { ...SUMMARY.competitionLeaders, items: [] },
        records: {
          biggestWin: null,
          mostGoalsMatch: null,
          mostGoalsClubSeason: null,
          longestUnbeatenSeason: null,
          provenance: SUMMARY.records.provenance,
        },
      },
    });
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('lendas-metrics')).toBeTruthy();
  });
});

describe('LendasPageView — i18n nos três idiomas', () => {
  it('pt-br, en-us e es-es têm título e rótulos próprios (nada de literal no JSX)', () => {
    const expected = {
      'pt-br': { title: 'Lendas e Imortais', players: 'Jogadores', champions: 'Maiores campeões' },
      'en-us': {
        title: 'Legends and Immortals',
        players: 'Players',
        champions: 'Most decorated clubs',
      },
      'es-es': {
        title: 'Leyendas e Inmortales',
        players: 'Jugadores',
        champions: 'Máximos campeones',
      },
    } as const;

    for (const locale of ['pt-br', 'en-us', 'es-es'] as const) {
      const { unmount } = render(
        <LendasPageView
          locale={locale}
          data={SUMMARY}
          counts={COUNTS}
          generatedAt="2026-11-03T12:00:00.000Z"
        />,
      );
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(expected[locale].title);
      expect(screen.getByTestId('lendas-metric-players').previousElementSibling?.textContent).toBe(
        expected[locale].players,
      );
      expect(screen.getByTestId('lendas-champions').previousElementSibling?.textContent).toBe(
        expected[locale].champions,
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
    const keys = flatten(conceitoLendasStrings['pt-br']).sort();
    for (const locale of locales) {
      expect(flatten(conceitoLendasStrings[locale]).sort()).toEqual(keys);
    }
    expect(conceitoLendasStrings['en-us'].title).toBe('Legends and Immortals');
    expect(conceitoLendasStrings['es-es'].title).toBe('Leyendas e Inmortales');
  });
});
