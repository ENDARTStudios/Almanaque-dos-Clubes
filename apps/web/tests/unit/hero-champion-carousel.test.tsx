// @vitest-environment jsdom
/**
 * T568 — carrossel de campeões na hero: mundial E continentais.
 *
 * Pedido do Operador: "na hero, em 'Campeão Vigente no Acervo' deve destacar os campeões mundiais
 * vigentes e os campeões continentais, de modo que um carrossel".
 *
 * O que estes testes protegem, e por que cada um importa:
 *
 *  (a) O PATAMAR é rotulado. Sem o rótulo, o usuário veria "Real Madrid" e "Flamengo" lado a lado
 *      sem saber que estão em níveis diferentes — e concluiria que o acervo confunde as duas
 *      coisas. É a informação que dá sentido ao carrossel.
 *  (b) O MUNDIAL VEM PRIMEIRO. É a hierarquia; abrir com o continental inverteria a leitura.
 *  (c) SEM AUTOPLAY com `prefers-reduced-motion`. A rotação é enfeite; quem pediu menos movimento
 *      recebe o primeiro slide parado e navega pelos controles.
 *  (d) O avanço PAUSA em foco/hover. Trocar conteúdo embaixo do cursor de quem lê é hostil, e
 *      quem navega por teclado perderia o item focado.
 *  (e) A FONTE aparece em cada slide — a hero nunca exibe prova sem origem.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({ locale: 'pt-br' as const }),
}));

vi.mock('@/i18n/wsC12', () => ({
  wsC12Strings: {
    'pt-br': {
      carousel: {
        tierWorld: 'Campeão mundial',
        tierContinental: 'Campeão continental',
        tierOther: 'Campeão',
        carouselRole: 'carrossel',
        carouselLabel: 'Campeões vigentes no acervo',
        slideRole: 'slide',
        prev: 'Campeão anterior',
        next: 'Próximo campeão',
        of: 'de',
        source: 'ver fonte',
      },
    },
  },
}));

import HeroChampionCarousel, { type HeroChampion } from '@/components/HeroChampionCarousel';

const MUNDIAL: HeroChampion = {
  name: 'Real Madrid',
  clubId: 'club-1',
  competitionName: 'FIFA Club World Cup',
  competitionId: 'comp-1',
  season: 2023,
  hierarchy: 'mundial',
  sourceUrl: 'https://www.wikidata.org/wiki/Q1',
};
const CONTINENTAL: HeroChampion = {
  name: 'Flamengo',
  clubId: 'club-2',
  competitionName: 'Copa Libertadores',
  competitionId: 'comp-2',
  season: 2024,
  hierarchy: 'continental',
  sourceUrl: 'https://www.wikidata.org/wiki/Q2',
};

/** Controla o que `matchMedia` responde para `prefers-reduced-motion`. */
function mockReducedMotion(reduzir: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduzir : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

async function montar(champions: HeroChampion[]) {
  render(<HeroChampionCarousel champions={champions} />);
  await act(async () => {
    for (let i = 0; i < 3; i++) await Promise.resolve();
  });
}

beforeEach(() => mockReducedMotion(false));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HeroChampionCarousel — mundial e continentes', () => {
  it('(a) o PATAMAR de cada slide é rotulado — é o que dá sentido ao carrossel', async () => {
    await montar([MUNDIAL, CONTINENTAL]);
    const tier = screen.getByTestId('hero-champion-tier');
    expect(tier.textContent).toContain('mundial');
    // O atributo permite conferir a hierarquia sem depender do texto traduzido.
    expect(tier.getAttribute('data-tier')).toBe('mundial');
  });

  it('(b) o MUNDIAL vem primeiro (a hierarquia manda na ordem)', async () => {
    await montar([MUNDIAL, CONTINENTAL]);
    expect(screen.getByTestId('hero-champion-name').textContent).toContain('Real Madrid');
  });

  it('(e) a FONTE aparece no slide — a hero não exibe prova sem origem', async () => {
    await montar([MUNDIAL]);
    const fonte = screen.getByTestId('hero-champion-source');
    expect(fonte.getAttribute('href')).toBe('https://www.wikidata.org/wiki/Q1');
    expect(fonte.getAttribute('rel')).toContain('noopener');
  });

  it('navega para o continental e TROCA o rótulo de patamar', async () => {
    await montar([MUNDIAL, CONTINENTAL]);
    await act(async () => {
      fireEvent.click(screen.getByTestId('hero-champion-next'));
    });
    expect(screen.getByTestId('hero-champion-name').textContent).toContain('Flamengo');
    expect(screen.getByTestId('hero-champion-tier').getAttribute('data-tier')).toBe('continental');
  });

  it('volta do primeiro para o último (navegação circular)', async () => {
    await montar([MUNDIAL, CONTINENTAL]);
    await act(async () => {
      fireEvent.click(screen.getByTestId('hero-champion-prev'));
    });
    expect(screen.getByTestId('hero-champion-name').textContent).toContain('Flamengo');
  });

  it('os pontos mostram QUANTOS campeões existem, e marcam o atual', async () => {
    await montar([MUNDIAL, CONTINENTAL]);
    expect(screen.getByTestId('hero-champion-dots')).toBeTruthy();
    expect(screen.getByTestId('hero-champion-dot-0').getAttribute('aria-current')).toBe('true');
    expect(screen.getByTestId('hero-champion-dot-1').getAttribute('aria-current')).toBeNull();
  });

  it('com UM campeão só, não mostra controles (não há para onde ir)', async () => {
    await montar([MUNDIAL]);
    expect(screen.queryByTestId('hero-champion-next')).toBeNull();
    expect(screen.queryByTestId('hero-champion-prev')).toBeNull();
    expect(screen.queryByTestId('hero-champion-dots')).toBeNull();
  });

  it('lista vazia não renderiza nada (e não estoura)', async () => {
    const { container } = render(<HeroChampionCarousel champions={[]} />);
    await act(async () => {
      for (let i = 0; i < 2; i++) await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="hero-champion-carousel"]')).toBeNull();
  });
});

describe('HeroChampionCarousel — a régua de movimento', () => {
  it('(c) SEM autoplay quando o sistema pede movimento reduzido', async () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    await montar([MUNDIAL, CONTINENTAL]);

    const antes = screen.getByTestId('hero-champion-name').textContent;
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    // Continua no mesmo lugar: a rotação automática é enfeite, e o gate a desliga.
    expect(screen.getByTestId('hero-champion-name').textContent).toBe(antes);
  });

  it('(c2) com movimento permitido, o slide AVANÇA sozinho', async () => {
    vi.useFakeTimers();
    await montar([MUNDIAL, CONTINENTAL]);

    const antes = screen.getByTestId('hero-champion-name').textContent;
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByTestId('hero-champion-name').textContent).not.toBe(antes);
  });

  it('(d) PAUSA quando o ponteiro entra, e retoma quando sai', async () => {
    vi.useFakeTimers();
    await montar([MUNDIAL, CONTINENTAL]);
    const regiao = screen.getByTestId('hero-champion-carousel');

    await act(async () => {
      fireEvent.mouseEnter(regiao);
    });
    const durante = screen.getByTestId('hero-champion-name').textContent;
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    // Parado: trocar o conteúdo embaixo do cursor de quem lê é hostil.
    expect(screen.getByTestId('hero-champion-name').textContent).toBe(durante);

    await act(async () => {
      fireEvent.mouseLeave(regiao);
    });
    /* O `advanceTimersByTime` vai num `act` SEPARADO de propósito: `mouseLeave` só muda o estado,
       e é o efeito disparado por essa mudança que recria o `setInterval`. Avançar o relógio no
       mesmo `act` mediria o intervalo ANTES de ele existir, e o teste acusaria "não retomou"
       quando o componente está correto. */
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByTestId('hero-champion-name').textContent).not.toBe(durante);
  });

  it('(d2) PAUSA no foco — quem navega por teclado não perde o item focado', async () => {
    vi.useFakeTimers();
    await montar([MUNDIAL, CONTINENTAL]);

    await act(async () => {
      fireEvent.focus(screen.getByTestId('hero-champion-next'));
    });
    const durante = screen.getByTestId('hero-champion-name').textContent;
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByTestId('hero-champion-name').textContent).toBe(durante);
  });
});
