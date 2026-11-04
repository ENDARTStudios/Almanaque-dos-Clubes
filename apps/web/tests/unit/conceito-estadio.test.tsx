// @vitest-environment jsdom
/**
 * FICHA DO ESTÁDIO no conceito FICHA — testes da composição e do contrato real.
 *
 * O defeito que estes testes travam: a página tinha os tokens e componentes do sistema, mas a
 * composição ainda era a antiga (FichaHead + um Pillar + dl), sem o quadro `estadio`.
 *
 * O risco oposto é "ficar igual ao desenho" inventando dado. O quadro desenha 78.838 de
 * capacidade, 199.854 de recorde, 412 partidas, 1.148 gols, 2,79 de média e os nomes
 * Maracanã/Flamengo/Fluminense/Vasco/Botafogo. Nada disso pode aparecer: a API pública do estádio
 * não publica público por partida, inauguração, partidas, gols nem média. Os testes exigem que
 * "—" substitua a fonte ausente e que os blocos de série inexistente não sejam desenhados.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'pt-br' }) }),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import DetailUnavailable from '@/components/ficha/DetailUnavailable';
import EstadioFichaPageView from '@/components/conceito/estadio/EstadioFichaPageView';
import EstadioPage from '@/app/estadios/[id]/page';
import type { Estadio } from '@/components/conceito/estadio/types';

/** Payload real de `GET /stadiums/:id` — nenhum número copiado do desenho. */
const ESTADIO: Estadio = {
  id: 'estadio-teste',
  name: 'Estádio de Teste',
  city: 'Cidade de Teste',
  state: 'TS',
  country: 'BR',
  capacity: 66000,
  surface: 'grama natural',
  latitude: -22.9121,
  longitude: -43.2302,
  clubId: 'clube-teste',
  clubName: 'Clube de Teste',
  sourceUrl: 'https://www.wikidata.org/wiki/Q1',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderView(overrides: Partial<Estadio> = {}) {
  return render(<EstadioFichaPageView locale="pt-br" estadio={{ ...ESTADIO, ...overrides }} />);
}

describe('EstadioFichaPageView — composição do quadro estadio', () => {
  it('abre com kicker de localização, um único h1 display e subtítulo com dado real', () => {
    const { container } = renderView();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Estádio de Teste');
    expect(headings[0].className).toContain('font-heading');

    expect(screen.getByTestId('estadio-kicker').textContent).toBe('Estádio · Cidade de Teste · BR');
    expect(container.textContent).toContain('Capacidade 66.000');
    expect(container.textContent).toContain('Piso grama natural');
    expect(container.textContent).toContain('Clube mandante Clube de Teste');
  });

  it('a faixa de métricas usa a capacidade real e declara "—" nas cinco sem fonte', () => {
    renderView();
    expect(screen.getByTestId('estadio-metric-capacity').textContent).toBe('66.000');
    for (const key of ['recordAttendance', 'inauguration', 'matches', 'goals', 'average']) {
      const cell = screen.getByTestId(`estadio-metric-${key}`);
      expect(cell.textContent).toBe('—');
      expect(cell.textContent).not.toBe('0');
      expect(cell.className).toContain('text-ink-3');
    }
    // O desenho usa 78.838 / 199.854 / 412 / 1.148 / 2,79. Nada disso foi copiado.
    const metrics = screen.getByTestId('estadio-metrics').textContent ?? '';
    expect(metrics).not.toContain('78.838');
    expect(metrics).not.toContain('199.854');
    expect(metrics).not.toContain('412');
    expect(metrics).not.toContain('1.148');
    expect(metrics).not.toContain('2,79');
    expect(metrics).toContain('não são publicados pela API');
  });

  it('a moldura da imagem declara a lacuna — não desenha arquibancada nem publica foto sem licença', () => {
    renderView();
    const frame = screen.getByTestId('estadio-image-frame');
    expect(frame.querySelector('img')).toBeNull();
    expect(frame.textContent).toContain('Sem foto com licença no acervo');
    expect(frame.textContent).toContain('não desenha arquibancada');
    // As coordenadas reais entram como localização, não como ilustração inventada.
    expect(frame.textContent).toContain('-22.9121, -43.2302');
  });

  it('História declara a lacuna e mantém a fonte do registro', () => {
    renderView();
    const history = screen.getByTestId('estadio-history');
    expect(history.textContent).toContain('não publica relato histórico deste estádio');
    const source = history.querySelector('a');
    expect(source?.getAttribute('href')).toBe('https://www.wikidata.org/wiki/Q1');
    expect(source?.textContent).toContain('Wikidata');
    expect(source?.textContent).toContain('CC0');
  });

  it('"Clubes que mandam aqui" mostra o vínculo real e declara a lacuna de partidas', () => {
    renderView();
    const card = screen.getByTestId('estadio-club-card');
    const link = card.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/clubs/clube-teste');
    expect(link?.textContent).toBe('Clube de Teste');
    expect(card.textContent).toContain('Clube mandante vinculado ao registro');
    expect(card.textContent).toContain('Partidas e aproveitamento por estádio');
  });

  it('não desenha "Maiores públicos" sem série real — declara a ausência', () => {
    renderView();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Maiores públicos')).toBeNull();
    const gap = screen.getByTestId('estadio-attendance-gap');
    expect(gap.textContent).toContain('não entram nesta ficha');
    expect(gap.textContent).toContain('não publica público por partida');
  });

  it('a ficha técnica preserva cidade, estado, país, piso e coordenadas', () => {
    renderView();
    const details = screen.getByTestId('estadio-details');
    expect(details.textContent).toContain('Cidade de Teste');
    expect(details.textContent).toContain('TS');
    expect(details.textContent).toContain('BR');
    expect(details.textContent).toContain('grama natural');
    expect(details.textContent).toContain('-22.9121, -43.2302');
  });

  it('registro sem clube/capacidade/coordenada vira "—" declarado, nunca zero', () => {
    renderView({
      capacity: null,
      latitude: null,
      longitude: null,
      clubId: null,
      clubName: null,
    });
    expect(screen.getByTestId('estadio-metric-capacity').textContent).toBe('—');
    expect(screen.getByTestId('estadio-club-card').textContent).toContain('Nenhum clube vinculado');
    expect(screen.getByTestId('estadio-details').textContent).not.toContain('0.0000');
  });
});

describe('/estadios/[id] — o payload real alimenta o quadro e o JSON-LD', () => {
  it('mapeia GET /stadiums/:id para a ficha e injeta StadiumOrArena', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: ESTADIO }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    const ui = await EstadioPage({ params: Promise.resolve({ id: ESTADIO.id }) });
    const { container } = render(ui);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Estádio de Teste');
    expect(screen.getByTestId('estadio-metric-capacity').textContent).toBe('66.000');

    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    expect(ld?.textContent).toContain('StadiumOrArena');
    expect(ld?.textContent).toContain('Estádio de Teste');
    expect(ld?.textContent).toContain('"maximumAttendeeCapacity":66000');
    expect(ld?.textContent).toContain('"latitude":-22.9121');
    // Nada de inauguração/recorde no structured data: a fonte não os publica.
    expect(ld?.textContent).not.toContain('openingDate');
    expect(ld?.textContent).not.toContain('199.854');
  });

  it('falha de origem vira DetailUnavailable — nunca 404 falso', async () => {
    global.fetch = vi.fn(
      async () => new Response('{"error":"INTERNAL"}', { status: 500 }),
    ) as unknown as typeof fetch;

    const ui = await EstadioPage({ params: Promise.resolve({ id: ESTADIO.id }) });
    expect(ui.type).toBe(DetailUnavailable);
  });

  it('404 da origem vira notFound()', async () => {
    global.fetch = vi.fn(
      async () => new Response('{"error":"NOT_FOUND"}', { status: 404 }),
    ) as unknown as typeof fetch;

    await expect(EstadioPage({ params: Promise.resolve({ id: ESTADIO.id }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
