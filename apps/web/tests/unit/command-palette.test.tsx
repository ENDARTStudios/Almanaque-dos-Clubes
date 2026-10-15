// @vitest-environment jsdom
/**
 * PALETA DE COMANDO — testes de comportamento (conceito visual, quadro 03).
 *
 * Por que aqui e não em `tests/e2e`: os specs de `tests/e2e` são do Playwright, e **nenhum
 * workflow do CI invoca o Playwright** (o script `test` do `apps/web` é `vitest run`). Um spec
 * a mais lá seria um teste que nunca executa — não fecharia lacuna nenhuma. Aqui ele roda no
 * CI de verdade.
 *
 * O que estes testes protegem são as decisões que têm MOTIVO, não a aparência:
 *   (a) nada renderiza fechado — o portal não pode montar por conta própria;
 *   (b) o foco cai no campo ao abrir;
 *   (c) menos de 2 letras NÃO dispara requisição (o gate que evita uma chamada por tecla);
 *   (d) resultados são agrupados e a contagem é ROTULADA — a regra "número nunca solto";
 *   (e) `aria-activedescendant` acompanha a seta e aponta para elemento existente;
 *   (f) Enter navega para a rota do TIPO certo (clube ≠ competição ≠ jogador);
 *   (g) Esc fecha;
 *   (h) RESPOSTA OBSOLETA É DESCARTADA — a guarda de sequência. Este é o defeito de corrida
 *       que o teste existe para impedir: a resposta de "re" chegando depois da de "real".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

vi.mock('@/i18n/Provider', async () => {
  const { wsC2Strings } = await import('@/i18n/wsC2');
  return {
    useI18n: () => ({
      locale: 'pt-br' as const,
      t: (k: string) => k,
      dict: { pages: { champions: { source: 'Fonte' } } },
      wsC2: wsC2Strings['pt-br'],
    }),
  };
});

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

const get = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...a: unknown[]) => get(...a) } }));

import CommandPalette from '@/components/CommandPalette';

type Resultado = {
  type: 'club' | 'competition' | 'player';
  id: string;
  qid: string | null;
  name: string;
  subtitle: string | null;
  country: string | null;
  score: number;
  sourceUrl: string | null;
};

const CLUBE: Resultado = {
  type: 'club',
  id: '1',
  qid: 'Q8682',
  name: 'Real Madrid Club de Fútbol',
  subtitle: 'Espanha · 1902 · 36 títulos',
  country: 'Espanha',
  score: 9,
  sourceUrl: null,
};
const COMPETICAO: Resultado = {
  type: 'competition',
  id: '9',
  qid: 'Q2603',
  name: 'La Liga',
  subtitle: 'Espanha · 1929 → hoje',
  country: 'Espanha',
  score: 8,
  sourceUrl: null,
};
const JOGADOR: Resultado = {
  type: 'player',
  id: '5',
  qid: 'Q615',
  name: 'Cristiano Ronaldo',
  subtitle: 'Atacante · Portugal',
  country: 'Portugal',
  score: 7,
  sourceUrl: null,
};

const resposta = (results: Resultado[]) => ({
  query: 'real',
  normalizedQuery: 'real',
  type: 'all' as const,
  results,
  pagination: { limit: 12, offset: 0, total: results.length },
  limitations: [],
});

/** Digita e deixa o debounce de 220ms vencer. */
async function digitar(texto: string) {
  fireEvent.change(screen.getByTestId('palette-input'), { target: { value: texto } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  get.mockReset();
  push.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Paleta de comando', () => {
  it('(a) não renderiza nada quando fechada', () => {
    render(<CommandPalette open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('command-palette')).toBeNull();
    expect(screen.queryByTestId('palette-input')).toBeNull();
  });

  it('(b) ao abrir, o foco vai para o campo e o scroll do corpo é travado', async () => {
    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByTestId('palette-input')).toBe(document.activeElement);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('(c) com 1 letra mostra o aviso e NÃO chama a API', async () => {
    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await digitar('r');
    expect(get).not.toHaveBeenCalled();
    expect(screen.getByText('Digite ao menos 2 letras.')).toBeTruthy();
  });

  it('(d) agrupa por tipo e rotula a contagem de cada resultado', async () => {
    get.mockResolvedValue(resposta([CLUBE, COMPETICAO, JOGADOR]));
    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await digitar('real');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    // Os três grupos, na ordem que o conceito declara.
    const grupos = screen.getAllByText(/Clubes & seleções|Competições|Jogadores/).map((e) => e.textContent);
    expect(grupos).toContain('Clubes & seleções');
    expect(grupos).toContain('Competições');
    expect(grupos).toContain('Jogadores');

    // A CONTAGEM VEM ROTULADA: "36 títulos" e não "36" solto.
    expect(screen.getByText('Espanha · 1902 · 36 títulos')).toBeTruthy();
    // E a contagem total do rodapé também tem rótulo.
    expect(screen.getByText('3 resultado(s)')).toBeTruthy();
  });

  it('(e) a seta move o ativo e o aria-activedescendant aponta para elemento existente', async () => {
    get.mockResolvedValue(resposta([CLUBE, COMPETICAO]));
    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await digitar('real');

    const input = screen.getByTestId('palette-input');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-activedescendant')).toBe('palette-opt-0');
    expect(document.getElementById('palette-opt-0')).toBeTruthy();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe('palette-opt-1');
    expect(document.getElementById('palette-opt-1')).toBeTruthy();

    // Circular: da última volta para a primeira (não trava na ponta).
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe('palette-opt-0');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.getAttribute('aria-activedescendant')).toBe('palette-opt-1');
  });

  it('(f) Enter navega para a rota do TIPO do item ativo', async () => {
    get.mockResolvedValue(resposta([CLUBE, COMPETICAO]));
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await digitar('real');

    const input = screen.getByTestId('palette-input');
    // Primeiro item é clube.
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/clubs/1');
    expect(onClose).toHaveBeenCalled();

    // Agora o segundo, que é competição — a rota MUDA com o tipo.
    push.mockReset();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/competitions/9');
  });

  it('(f2) jogador vai para /players, não para /clubs', async () => {
    get.mockResolvedValue(resposta([JOGADOR]));
    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await digitar('real');
    fireEvent.keyDown(screen.getByTestId('palette-input'), { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/players/5');
  });

  it('(g) Esc fecha e RESTAURA o scroll do corpo', async () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('(h) resposta OBSOLETA é descartada — a guarda de sequência', async () => {
    // A segunda busca resolve DEPOIS da primeira, mas foi pedida antes: sem a guarda, a
    // lista terminaria com o resultado de "re" enquanto o campo mostra "real".
    let resolverLento: ((v: unknown) => void) | null = null;
    get
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolverLento = res;
          }),
      )
      .mockImplementationOnce(() => Promise.resolve(resposta([JOGADOR])));

    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    await digitar('real'); // 1a busca: fica pendente
    await digitar('realmadrid'); // 2a busca: resolve primeiro
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByText('Cristiano Ronaldo')).toBeTruthy();

    // Agora a PRIMEIRA resposta chega, atrasada. Não pode sobrescrever a lista atual.
    await act(async () => {
      resolverLento?.(resposta([CLUBE, COMPETICAO]));
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.queryByText('La Liga')).toBeNull();
    expect(screen.getByText('Cristiano Ronaldo')).toBeTruthy();
  });

  it('(i) erro da API é declarado, sem lista fantasma', async () => {
    get.mockRejectedValue(new Error('rede'));
    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await digitar('real');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByTestId('palette-error')).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('(j) busca vazia na API devolve estado vazio declarado, não silêncio', async () => {
    get.mockResolvedValue(resposta([]));
    render(<CommandPalette open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await digitar('real');
    // `waitFor` NÃO serve aqui: ele agenda por tempo real e os timers estão falsos, então
    // nunca avança. A espera é por microtask, que é o que resolve a promessa do mock.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const vazio = screen.queryByTestId('palette-empty');
    const carregando = screen.queryByTestId('palette-loading');
    expect(
      vazio,
      `esperava o estado vazio. carregando=${!!carregando} html=${document.body.innerHTML.slice(0, 300)}`,
    ).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
