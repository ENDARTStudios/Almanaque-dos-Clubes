// @vitest-environment jsdom
/**
 * FICHA DE JOGADOR no conceito FICHA — testes da composição extraída.
 *
 * O defeito que estes testes travam: a ficha tinha os componentes do sistema, mas continuava
 * com a composição antiga (cartão `rounded-2xl`, métricas em cartão, carreira por temporada,
 * conquistas e prêmios em listas). O quadro `jogador-migrado` pede cabeçalho de ficha com
 * retrato em moldura, faixa de pilares, carreira por clube, gols por passagem, conquistas e
 * prêmios em tabela e clubes em cartões.
 *
 * O risco oposto é "ficar igual ao desenho" inventando dado: o quadro usa 1.363 jogos, 1.279
 * gols, 0,94 de média, 37 títulos e passagens como "Santos 1956–58 · 3 temporadas". Os testes
 * exigem que NADA disso apareça e que "—" substitua a fonte ausente (jogos por passagem,
 * média, licença de retrato).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import JogadorFichaPageView from '@/components/conceito/jogador/JogadorFichaPageView';
import { conceitoJogadorStrings } from '@/i18n/wsConceitoJogador';
import type {
  JogadorIdentity,
  JogadorPhoto,
  JogadorProfile,
} from '@/components/conceito/jogador/types';

afterEach(cleanup);

const PLAYER: JogadorIdentity = {
  id: 'jogador-1',
  fullName: 'Jogador de Teste',
  shortName: 'JDT',
  nickname: 'Testinha',
  birthDate: '1990-03-12',
  age: 36,
  country: 'BR',
  position: 'FORWARD',
  heightCm: 180,
  preferredFoot: 'right',
  qid: 'Q123',
  importedFrom: 'wikidata',
  sourceUrl: 'https://www.wikidata.org/wiki/Q123',
  fansCount: 12,
  officialSite: null,
  socialLinks: null,
  followersSnapshot: null,
};

const NO_PHOTO: JogadorPhoto = {
  url: null,
  license: null,
  author: null,
  sourceUrl: null,
};

const PROFILE: JogadorProfile = {
  currentClub: { id: 'clube-1', name: 'Clube de Teste' },
  career: [
    {
      year: 2010,
      endYear: 2012,
      apps: 100,
      goals: 20,
      clubId: 'clube-1',
      clubName: 'Clube de Teste',
    },
    {
      year: 2013,
      endYear: 2014,
      apps: 50,
      goals: 10,
      clubId: 'clube-1',
      clubName: 'Clube de Teste',
    },
    {
      year: 2016,
      endYear: 2017,
      apps: null,
      goals: 5,
      clubId: 'clube-2',
      clubName: 'Outro Clube',
    },
  ],
  achievements: [
    { competitionId: 'copa', competitionName: 'Copa de Teste', year: 2011 },
    { competitionId: 'copa', competitionName: 'Copa de Teste', year: 2013 },
    { competitionId: 'liga', competitionName: 'Liga de Teste', year: null },
  ],
  clubs: [
    { id: 'clube-1', name: 'Clube de Teste', country: 'BR' },
    { id: 'clube-2', name: 'Outro Clube', country: 'AR' },
  ],
  metrics: { totalApps: 150, totalGoals: 35, titlesCount: 3, awardsCount: 3 },
  individualAwards: [
    { qid: 'Q1', label: 'Bola de Ouro', year: 2012, sourceUrl: 'https://example.org/a1' },
    { qid: 'Q2', label: 'Bola de Ouro', year: 2014, sourceUrl: 'https://example.org/a1' },
    { qid: 'Q3', label: 'Melhor jogador', year: null, sourceUrl: null },
  ],
};

function renderView(
  overrides: Partial<Parameters<typeof JogadorFichaPageView>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <JogadorFichaPageView
      locale="pt-br"
      player={PLAYER}
      photo={NO_PHOTO}
      profile={PROFILE}
      {...overrides}
    />,
  );
}

describe('JogadorFichaPageView — composição do quadro jogador-migrado', () => {
  it('abre com kicker "Jogador · posição · país" e um único h1 com o nome completo', () => {
    const { container } = renderView();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Jogador de Teste');
    expect(headings[0].className).toContain('font-heading');
    expect(container.textContent).toContain('Jogador · atacante · Brasil');
  });

  it('subtítulo leva apelido, nascimento e clube atual (link), sem inventar fim de carreira', () => {
    const { container } = renderView();
    expect(container.textContent).toContain('Testinha');
    expect(container.textContent).toContain('1990');
    expect(container.textContent).toContain('36 anos');
    const clubLinks = container.querySelectorAll('a[href="/clubs/clube-1"]');
    expect(clubLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('sem foto, a moldura mostra ícone autoral e DECLARA a ilustração', () => {
    renderView();
    expect(screen.getByTestId('player-photo-fallback')).toBeTruthy();
    expect(screen.getByTestId('player-photo-illustration').textContent).toContain(
      'Ilustração genérica de atacante',
    );
  });

  it('com foto, a moldura mostra a licença REAL catalogada e a fonte', () => {
    renderView({
      photo: {
        url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/retrato.png',
        license: 'CC BY-SA 4.0',
        author: 'Fotógrafo de Teste',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:retrato.png',
      },
    });
    const img = screen.getByTestId('player-photo');
    expect(img.getAttribute('alt')).toBe('Retrato de Jogador de Teste');
    const frame = screen.getByTestId('player-photo-frame');
    expect(frame.textContent).toContain('CC BY-SA 4.0');
    expect(frame.querySelector('a')?.getAttribute('href')).toBe(
      'https://commons.wikimedia.org/wiki/File:retrato.png',
    );
  });

  it('a faixa de pilares usa os números reais e calcula a média gols/jogo', () => {
    renderView();
    expect(screen.getByTestId('player-pillar-apps').textContent).toContain('150');
    expect(screen.getByTestId('player-pillar-goals').textContent).toContain('35');
    // 35 gols ÷ 150 jogos = 0,23 — derivado, nunca copiado do desenho (0,94).
    expect(screen.getByTestId('player-pillar-average').textContent).toContain('0,23');
    expect(screen.getByTestId('player-pillar-titles').textContent).toContain('3');
    const pillars = screen.getByTestId('player-pillars').textContent ?? '';
    expect(pillars).not.toContain('1.363');
    expect(pillars).not.toContain('1.279');
  });

  it('carreira agrupa por clube, soma passagens completas e declara lacuna quando falta número', () => {
    const { container } = renderView();
    const rows = screen.getAllByTestId('player-career-row');
    expect(rows).toHaveLength(2);
    // Ordenação: clube do vínculo mais recente primeiro.
    expect(rows[0].textContent).toContain('Outro Clube');
    expect(rows[0].textContent).toContain('2016–2017');
    expect(rows[0].textContent).toContain('5');
    // Sem jogos publicados => "—" em jogos e média (nunca um total parcial).
    const gapCells = [...rows[0].querySelectorAll('td')].filter((cell) => cell.textContent === '—');
    expect(gapCells.length).toBeGreaterThanOrEqual(2);

    expect(rows[1].textContent).toContain('Clube de Teste');
    expect(rows[1].textContent).toContain('2010–2012 · 2013–2014');
    expect(rows[1].textContent).toContain('150');
    expect(rows[1].textContent).toContain('30');
    expect(rows[1].textContent).toContain('0,20');
    expect(container.textContent).not.toContain('1.363');
  });

  it('gols por passagem entra quando há 2+ passagens com gols, com gols/jogo calculado', () => {
    renderView();
    const block = screen.getByTestId('player-goals-by-stint');
    expect(block.textContent).toContain('3 passagens');
    const rows = screen.getAllByTestId('player-stint-row');
    expect(rows).toHaveLength(3);
    const comJogos = rows.find((row) => row.textContent?.includes('20'));
    expect(comJogos?.textContent).toContain('2010–2012');
    expect(comJogos?.textContent).toContain('100');
    expect(comJogos?.textContent).toContain('0,20');
    // A passagem sem jogos publicados declara "—" em jogos e gols/jogo.
    const semJogos = rows.find((row) => row.textContent?.includes('Outro Clube'));
    expect(semJogos?.textContent).toContain('2016–2017');
    expect(semJogos?.textContent).toContain('—');
    // Menos de 2 passagens = bloco omitido (dado insuficiente, não 0).
    cleanup();
    renderView({ profile: { ...PROFILE, career: [PROFILE.career[2] as never] } });
    expect(screen.queryByTestId('player-goals-by-stint')).toBeNull();
  });

  it('conquistas agrupam por competição, contam títulos e listam os anos reais', () => {
    renderView();
    expect(screen.getByTestId('player-achievements').textContent).toContain('3 títulos');
    const rows = screen.getAllByTestId('player-achievement-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Copa de Teste');
    expect(rows[0].textContent).toContain('2');
    expect(rows[0].textContent).toContain('2011 · 2013');
    expect(rows[1].textContent).toContain('Liga de Teste');
    expect(rows[1].textContent).toContain('—');
  });

  it('prêmios agrupam por nome, contam vezes e mantêm a fonte por item', () => {
    renderView();
    expect(screen.getByTestId('player-awards').textContent).toContain('3 prêmios');
    const rows = screen.getAllByTestId('player-award-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Bola de Ouro');
    expect(rows[0].textContent).toContain('2');
    expect(rows[0].textContent).toContain('2012 · 2014');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('https://example.org/a1');
    expect(rows[1].textContent).toContain('Melhor jogador');
    expect(rows[1].textContent).toContain('—');
  });

  it('clubes viram cartões com o período real de cada passagem', () => {
    renderView();
    const cards = screen.getAllByTestId('player-club-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Clube de Teste');
    expect(cards[0].textContent).toContain('2010–2012 · 2013–2014');
    expect(cards[1].textContent).toContain('Outro Clube');
    expect(cards[1].textContent).toContain('2016–2017');
    expect(cards[0].getAttribute('href')).toBe('/clubs/clube-1');
  });

  it('ficha técnica preserva os campos de identidade e a bandeira do país', () => {
    renderView();
    const details = screen.getByTestId('player-details');
    // O rótulo da posição vem do módulo de ícones, no mesmo formato da página antiga.
    expect(details.textContent).toContain('atacante');
    expect(details.textContent).toContain('180 cm');
    expect(details.textContent).toContain('Destro');
    expect(details.querySelector('a[href="/clubs?country=BR"]')).toBeTruthy();
    expect(details.querySelector('a[href="https://www.wikidata.org/wiki/Q123"]')).toBeTruthy();
  });

  it('procedência no pé declara fonte, grafo, retrato e o significado do "—"', () => {
    renderView();
    const footer = screen.getByTestId('player-provenance');
    expect(footer.className).toContain('border-t');
    expect(footer.textContent).toContain('PLAYED_FOR');
    expect(footer.textContent).toContain('Sem retrato oficial no acervo');
    expect(footer.textContent).toContain('lacuna declarada');
    expect(footer.textContent).toContain('Importado de: wikidata');
  });

  it('não renderiza bloco sem dado e preserva os testids de vazio existentes', () => {
    renderView({ profile: null });
    expect(screen.queryByTestId('player-pillars')).toBeNull();
    expect(screen.getByTestId('career-empty')).toBeTruthy();
    expect(screen.getByTestId('achievements-empty')).toBeTruthy();
    expect(screen.getByTestId('individual-awards-empty')).toBeTruthy();
    expect(screen.getByTestId('clubs-empty')).toBeTruthy();
    expect(screen.queryByTestId('player-goals-by-stint')).toBeNull();
    expect(screen.getByTestId('player-provenance')).toBeTruthy();
  });

  it('não copia nenhum número ilustrativo do desenho', () => {
    const { container } = renderView();
    const text = container.textContent ?? '';
    expect(text).not.toContain('1.363');
    expect(text).not.toContain('1.279');
    expect(text).not.toContain('0,94');
    expect(text).not.toContain('37 títulos');
  });
});

describe('JogadorFichaPageView — i18n nos três idiomas', () => {
  it('pt-br, en-us e es-es têm headings próprios (nada de literal no JSX)', () => {
    const expected = {
      'pt-br': { career: 'Carreira', achievements: 'Conquistas' },
      'en-us': { career: 'Career', achievements: 'Achievements' },
      'es-es': { career: 'Carrera', achievements: 'Conquistas' },
    } as const;

    for (const locale of ['pt-br', 'en-us', 'es-es'] as const) {
      const { unmount } = renderView({ locale });
      expect(screen.getByTestId('player-career').textContent).toContain(expected[locale].career);
      expect(screen.getByTestId('player-achievements').textContent).toContain(
        expected[locale].achievements,
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
    const keys = flatten(conceitoJogadorStrings['pt-br']).sort();
    for (const locale of locales) {
      expect(flatten(conceitoJogadorStrings[locale]).sort()).toEqual(keys);
    }
    expect(conceitoJogadorStrings['en-us'].kicker).toBe('Player');
    expect(conceitoJogadorStrings['es-es'].kicker).toBe('Jugador');
  });
});
