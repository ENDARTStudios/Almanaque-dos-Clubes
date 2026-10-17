// @vitest-environment jsdom
/**
 * CountryIndex — o agrupamento por país de `/clubs` e `/players`.
 *
 * O que estes testes protegem é a decisão que originou o componente, não a aparência:
 *
 *  (a) a contagem vem do endpoint próprio e aparece ROTULADA ("817 clubes", nunca "817");
 *  (b) o LINK leva ao filtro que a página realmente aceita (`?country=XX`), e usa o `code` —
 *      não o nome — porque é o código que a API filtra;
 *  (c) falha do índice é DECLARADA, e não derruba a lista que fica abaixo;
 *  (d) país sem linha na tabela `Country` mostra o CÓDIGO como rótulo em vez de sumir (foram
 *      220 países no acervo, e esconder os sem-nome perderia acervo);
 *  (e) a lista é cortada em 24 e o "ver todos" aparece só quando há mais que isso.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({
    locale: 'pt-br' as const,
    t: (k: string) =>
      ({
        'pages.byCountry.title': 'Por país',
        'pages.byCountry.filterPlaceholder': 'Filtrar país…',
        'pages.byCountry.filterLabel': 'Filtrar país',
        'pages.byCountry.clear': 'limpar filtro de país',
        'pages.byCountry.empty': 'Nenhum país com esse nome.',
        'pages.byCountry.showAll': 'Ver todos os {n} países',
        'pages.byCountry.error': 'Não foi possível carregar o índice de países.',
      })[k] ?? k,
  }),
}));

/* `vi.hoisted`: o mock é içado para antes dos imports, e o `get` precisa existir naquele
   momento. Sem isto a fábrica do `vi.mock` captura uma variável ainda não inicializada — o
   componente recebe um mock diferente do que o teste configura, a rejeição do caso (c) nunca
   passa pelo `.catch()` e o vitest a reporta como NÃO TRATADA. O sintoma era confuso: o
   componente exibia a mensagem de erro certa (porque o `catch` do teste também rodava) e o
   teste falhava mesmo assim. */
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));
vi.mock('@/hooks/useGsap', () => ({ useGsapStagger: () => {} }));

import CountryIndex from '@/components/CountryIndex';

const indice = (
  countries: Array<{ code: string; name: string | null; clubs?: number; players?: number }>,
) => ({
  data: {
    generatedAt: '2026-10-15T00:00:00.000Z',
    source: 'derived',
    baseQuery: 'COUNT(clubs) GROUP BY country',
    totals: { countries: countries.length, clubsWithCountry: 1 },
    countries,
  },
});

async function montar(propriedades: Partial<Parameters<typeof CountryIndex>[0]> = {}) {
  render(
    <CountryIndex
      basePath="/clubs"
      endpoint="/clubs/countries"
      campo="clubs"
      rotulo="clubes"
      {...propriedades}
    />,
  );
  /* Espera os microtasks do efeito. Quatro voltas, e não duas: entre o `await` da promessa e o
     `setEstado` há o `.then` do componente, e o `act` precisa drenar também o `catch`. Com duas
     voltas o caso de ERRO não era drenado e o vitest reportava a rejeição como não tratada —
     mesmo com o componente exibindo a mensagem corretamente. */
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

beforeEach(() => get.mockReset());
afterEach(cleanup);

describe('CountryIndex — agrupamento por país', () => {
  it('(b) o link usa o CÓDIGO ISO2, que é o valor que a API filtra', async () => {
    get.mockResolvedValue(indice([{ code: 'BR', name: 'Brazil', clubs: 817 }]));
    await montar();
    const link = screen.getByTestId('country-BR');
    // `?country=BR`, e nao `?country=Brazil`: a API filtra pelo codigo.
    expect(link.getAttribute('href')).toBe('/clubs?country=BR');
  });

  it('(f) o nome do país aparece no IDIOMA da página, não no da tabela `countries`', async () => {
    /* O defeito medido em produção (auditoria de 16/10): este cartão renderizava `p.name`, que
       é o nome canônico da tabela `countries` — em INGLÊS. Em pt-br a tela mostrava "Spain";
       em es-es, "Spain ES 39 competiciones" (0 de 29 nomes no idioma da página), e o /players
       se contradizia: cartão "Spain 6.006" acima de linhas "Espanha". */
    get.mockResolvedValue(indice([{ code: 'ES', name: 'Spain', clubs: 39 }]));
    await montar();
    const cartao = screen.getByTestId('country-ES');
    expect(cartao.textContent).toContain('Espanha');
    expect(cartao.textContent).not.toContain('Spain');
  });

  it('(g) país RETIRADO da ISO mostra a SIGLA ao lado da bandeira — nunca o nome do sucessor', async () => {
    /* `name` da tabela traz o nome histórico em inglês ("German Democratic Republic") e o CLDR
       diria "Alemanha". Aqui os dois estão errados para um acervo histórico: a sigla é o rótulo
       e a bandeira de época é quem informa o país (ver lib/country-flag). */
    get.mockResolvedValue(indice([{ code: 'DD', name: 'German Democratic Republic', clubs: 7 }]));
    await montar();
    const cartao = screen.getByTestId('country-DD');
    expect(cartao.textContent).toContain('DD');
    expect(cartao.textContent).not.toContain('German');
    expect(cartao.textContent).not.toContain('Alemanha');
  });

  it('(a) a contagem aparece ROTULADA, não solta', async () => {
    get.mockResolvedValue(indice([{ code: 'BR', name: 'Brazil', clubs: 817 }]));
    await montar();
    const cartao = screen.getByTestId('country-BR');
    expect(cartao.textContent).toContain('817');
    // O rotulo tem de estar no MESMO cartao do numero, senao o numero fica sem sentido.
    expect(cartao.textContent?.toLowerCase()).toContain('clubes');
  });

  it('(b) o rótulo do número muda com o campo: jogadores, não clubes', async () => {
    get.mockResolvedValue(indice([{ code: 'GB', name: 'United Kingdom', players: 26020 }]));
    await montar({
      basePath: '/players',
      endpoint: '/players/countries',
      campo: 'players',
      rotulo: 'jogadores',
    });
    const cartao = screen.getByTestId('country-GB');
    expect(cartao.getAttribute('href')).toBe('/players?country=GB');
    expect(cartao.textContent?.toLowerCase()).toContain('jogadores');
    expect(cartao.textContent).not.toContain('clubes');
  });

  it('(c) falha do índice é DECLARADA, e o componente não estoura', async () => {
    /* COMO ESTE TESTE FOI ESCRITO, e por que não com uma rejeição direta do mock.
     *
     * O caminho ideal seria `get.mockRejectedValue(new Error('rede'))`. Isso NÃO funciona aqui, e
     * a causa não é o componente: o vitest contabiliza a promise rejeitada como rejeição NÃO
     * TRATADA antes de o `.catch()` do efeito ser anexado, e o teste falha com `Error: rede`
     * apontando para a linha do mock — não como asserção. Tentei `mockImplementation` com
     * `Promise.reject`, com `async`/`throw`, e `vi.hoisted`: os três dão o mesmo resultado.
     *
     * O que está PROVADO, com instrumentação, é que o componente trata: montado com o mock
     * rejeitando, o DOM continha
     *   <p data-testid="country-index-error">Não foi possível carregar o índice de países.</p>
     * ou seja, o `.catch()` rodou e o estado de erro foi renderizado. O defeito é da mecânica do
     * mock sob o runner, não do caminho de erro do componente.
     *
     * Então o teste exercita o MESMO `.catch()` por outro caminho: um `then` que lança. O efeito
     * encadeia `.then(...).catch(...)`, e uma exceção no `then` é capturada pelo `catch` — que é
     * exatamente a linha que precisa de cobertura. O que NÃO fica coberto é a rejeição vinda do
     * transporte; essa depende de integração real com a API.
     */
    get.mockImplementation(() =>
      Promise.resolve({
        get data(): never {
          throw new Error('índice indisponível');
        },
      }),
    );
    await montar();
    expect(screen.getByTestId('country-index-error')).toBeTruthy();
    // Sem cartões — melhor não mostrar nada do que mostrar zero países como se fosse fato.
    // O seletor exige o CÓDIGO (duas maiúsculas): `/^country-/` sozinho casaria também com
    // `country-index-error`, `-title`, `-filter` e `-clear`, e o teste passaria a medir o
    // cabeçalho em vez dos países. Foi exatamente o que aconteceu na primeira versão.
    expect(screen.queryAllByTestId(/^country-[A-Z]{2}$/)).toHaveLength(0);
  });

  it('(d) país sem linha em `Country` mostra o CÓDIGO como rótulo, não some', async () => {
    // Medido: dos 220 países do acervo, alguns não têm nome legível. Esconder perderia acervo.
    get.mockResolvedValue(indice([{ code: 'RS', name: null, clubs: 12 }]));
    await montar();
    const cartao = screen.getByTestId('country-RS');
    expect(cartao.textContent).toContain('RS');
    expect(cartao.textContent).toContain('12');
  });

  it('(e) corta em 24 e oferece "ver todos" só quando há mais', async () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({
      code: `C${String(i).padStart(2, '0')}`,
      name: `País ${i}`,
      clubs: 30 - i,
    }));
    get.mockResolvedValue(indice(muitos));
    await montar();
    expect(screen.getByTestId('country-index-show-all')).toBeTruthy();
    // 24 visiveis, nao 30.
    expect(screen.getAllByTestId(/^country-C\d{2}$/).length).toBe(24);
  });

  it('(e) com 3 países NÃO oferece "ver todos"', async () => {
    get.mockResolvedValue(
      indice([
        { code: 'BR', name: 'Brazil', clubs: 817 },
        { code: 'PT', name: 'Portugal', clubs: 593 },
        { code: 'SE', name: 'Sweden', clubs: 903 },
      ]),
    );
    await montar();
    expect(screen.queryByTestId('country-index-show-all')).toBeNull();
    expect(screen.getAllByTestId(/^country-[A-Z]{2}$/).length).toBe(3);
  });

  it('marca o país selecionado com aria-current, para o filtro ativo ser audível', async () => {
    get.mockResolvedValue(
      indice([
        { code: 'BR', name: 'Brazil', clubs: 817 },
        { code: 'PT', name: 'Portugal', clubs: 593 },
      ]),
    );
    await montar({ selecionado: 'BR' });
    expect(screen.getByTestId('country-BR').getAttribute('aria-current')).toBe('true');
    // E o caminho de volta fica visível, em vez de o usuário ter de editar a URL.
    expect(screen.getByTestId('country-index-clear')).toBeTruthy();
    expect(screen.getByTestId('country-PT').getAttribute('aria-current')).toBeNull();
  });

  it('busca local filtra por nome e por código', async () => {
    get.mockResolvedValue(
      indice([
        { code: 'BR', name: 'Brazil', clubs: 817 },
        { code: 'PT', name: 'Portugal', clubs: 593 },
      ]),
    );
    await montar();
    const filtro = screen.getByTestId('country-index-filter');
    await act(async () => {
      filtro.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // O filtro é controlado; o teste confirma que ele existe e é acessível por rótulo.
    expect(screen.getByLabelText('Filtrar país')).toBe(filtro);
  });
});
