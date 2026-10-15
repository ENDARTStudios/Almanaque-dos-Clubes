// @vitest-environment jsdom
/**
 * Histórico de atividade — os TRÊS estados, e por que distinguir importa.
 *
 * A página dizia, com texto FIXO e sem consultar nada: "Nenhuma atividade registrada ainda" e
 * "Comece a pesquisar clubes e jogadores para ver seu histórico aqui". Era uma afirmação sobre a
 * conta do usuário que a página não tinha como fazer — e é FALSA: o backend tem
 * `GET /dashboard/activity` e responde 404 `TRACKING_DISABLED` ("desativado até a publicação das
 * políticas de cookies").
 *
 * A diferença não é cosmética: quem lê "nada registrado" vai pesquisar para "gerar" histórico que
 * nunca será gravado, e conclui que o produto não funciona. O teste (b) é o que fixa isso.
 *
 * Os três estados, e o que cada um significa:
 *   404          → o RECURSO está desligado por decisão de produto (declara o motivo real)
 *   200 com []   → a conta realmente não tem atividade
 *   erro de rede → não foi possível saber (lacuna, e NÃO "vazio")
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({
    locale: 'pt-br' as const,
    t: (k: string) =>
      ({
        'pages.dashboard.historyTitle': 'Histórico de atividade',
        'pages.dashboard.historyEmpty': 'Ainda não há atividade registrada nesta conta.',
        'pages.dashboard.historyPending':
          'O registro de atividade está desativado até a publicação das políticas de cookies.',
        'pages.dashboard.historyBack': 'Voltar ao Meu Almanaque',
        'pages.clubs.loadError': 'Não foi possível carregar agora.',
      })[k] ?? k,
  }),
}));

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));

import HistoryPage from '@/app/dashboard/history/page';

async function montar() {
  render(<HistoryPage />);
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

beforeEach(() => get.mockReset());
afterEach(cleanup);

describe('Histórico de atividade — três estados distintos', () => {
  it('(a) 404 do gate declara que o RECURSO está desligado, com o motivo', async () => {
    // `status` é o que o lib/api.ts anexa ao Error (o `code` do envelope não é propagado).
    /* A falha é provocada DENTRO do `.then` do componente, por um getter que lança ao ler `data`.
       Rejeitar a promessa do mock não serve aqui: o vitest a contabiliza como NÃO TRATADA antes de
       o `.catch` do efeito ser anexado, e o teste falha com o erro apontando para o mock em vez de
       como asserção — tentei `mockRejectedValue`, `async`/`throw` e objeto criado fora da chamada,
       os três com o mesmo resultado. Com o getter não há janela de microtask: o erro nasce dentro
       do `then`, e o `catch` encadeado no efeito o recebe. */
    get.mockImplementation(async () => ({
      get data(): never {
        throw Object.assign(new Error('Tracking de atividade desativado até WS-L'), {
          status: 404,
        });
      },
    }));
    await montar();
    const el = screen.getByTestId('history-state');
    expect(el.getAttribute('data-estado')).toBe('desligado');
    expect(el.textContent).toContain('cookies');
  });

  it('(b) NÃO diz "nada registrado" quando o recurso está desligado', async () => {
    /* O defeito original em uma asserção. Se alguém "simplificar" a página de volta para um
       texto único, este teste falha. */
    /* A falha é provocada DENTRO do `.then` do componente, por um getter que lança ao ler `data`.
       Rejeitar a promessa do mock não serve aqui: o vitest a contabiliza como NÃO TRATADA antes de
       o `.catch` do efeito ser anexado, e o teste falha com o erro apontando para o mock em vez de
       como asserção — tentei `mockRejectedValue`, `async`/`throw` e objeto criado fora da chamada,
       os três com o mesmo resultado. Com o getter não há janela de microtask: o erro nasce dentro
       do `then`, e o `catch` encadeado no efeito o recebe. */
    get.mockImplementation(async () => ({
      get data(): never {
        throw Object.assign(new Error('Tracking de atividade desativado até WS-L'), {
          status: 404,
        });
      },
    }));
    await montar();
    const texto = screen.getByTestId('history-state').textContent ?? '';
    expect(texto).not.toContain('Ainda não há atividade');
  });

  it('(c) lista vazia é o caso REAL "sem atividade" — e aí sim diz isso', async () => {
    get.mockImplementation(async () => ({ data: { recentSearches: [] } }));
    await montar();
    const el = screen.getByTestId('history-state');
    expect(el.getAttribute('data-estado')).toBe('vazio');
    expect(el.textContent).toContain('Ainda não há atividade');
  });

  it('(d) erro de rede é LACUNA declarada, não "conta vazia"', async () => {
    /* A falha é provocada DENTRO do `.then` do componente, por um getter que lança ao ler `data`.
       Rejeitar a promessa do mock não serve aqui: o vitest a contabiliza como NÃO TRATADA antes de
       o `.catch` do efeito ser anexado, e o teste falha com o erro apontando para o mock em vez de
       como asserção — tentei `mockRejectedValue`, `async`/`throw` e objeto criado fora da chamada,
       os três com o mesmo resultado. Com o getter não há janela de microtask: o erro nasce dentro
       do `then`, e o `catch` encadeado no efeito o recebe. */
    get.mockImplementation(async () => ({
      get data(): never {
        throw Object.assign(new Error('rede'), { status: 503 });
      },
    }));
    await montar();
    const el = screen.getByTestId('history-state');
    expect(el.getAttribute('data-estado')).toBe('erro');
    // Não pode ser confundido com "sua conta está vazia".
    expect(el.textContent).not.toContain('Ainda não há atividade');
  });

  it('oferece o caminho de volta para Meu Almanaque', async () => {
    get.mockImplementation(async () => ({ data: { recentSearches: [] } }));
    await montar();
    const voltar = screen.getByRole('link');
    expect(voltar.getAttribute('href')).toBe('/dashboard');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });
});
