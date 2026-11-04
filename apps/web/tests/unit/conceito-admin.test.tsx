// @vitest-environment jsdom
/**
 * /admin (Operação) no conceito FICHA.
 *
 * O que protege: os percentuais de qualidade são parte ÷ total arredondada (sem inventar 100%);
 * fila zerada não aparece; a lacuna de execuções/latência de ingestão é DECLARADA; e o catálogo
 * de funções usa os mesmos hrefs/testids do hub antigo.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AdminOperacao, { type AdminMetricsView } from '@/components/conceito/admin/AdminOperacao';
import { wsConceitoAdmin } from '@/i18n/wsConceitoAdmin';

afterEach(cleanup);
const s = wsConceitoAdmin['pt-br'];
const data: AdminMetricsView = {
  measuredAt: '2026-11-04T00:00:00Z',
  acervo: {
    clubsTotal: 12003,
    players: 105211,
    matches: 17265,
    competitions: 1932,
    seasons: 32,
    rankings: 72,
  },
  cobertura: {
    clubs: {
      total: 12000,
      logoUrl: 11000,
      stadiumName: 8400,
      teamColors: 9300,
      editorialText: 4100,
    },
    players: { total: 100000, photoUrl: 32000, country: 98000 },
  },
  filaPorChave: { moderacao: 7, revisao: 0 },
};
const areas = [
  { href: '/admin', label: 'Visão geral', desc: 'Índice' },
  { href: '/admin/revisao', label: 'Revisão de dados', desc: 'Fila' },
];

describe('AdminOperacao', () => {
  it('calcula a cobertura, esconde fila zerada e declara a lacuna de ingestão', () => {
    render(<AdminOperacao data={data} s={s} locale="pt-br" areas={areas} />);
    const qualidade = screen.getByRole('region', { name: s.qualityTitle });
    expect(qualidade.textContent).toContain('92%'); // 11000/12000
    expect(qualidade.textContent).toContain('70%'); // 8400/12000
    expect(qualidade.textContent).toContain('32%'); // 32000/100000
    const filas = screen.getByRole('region', { name: s.queuesTitle });
    expect(filas.textContent).toContain('Moderação de clubes');
    expect(filas.textContent).not.toContain('Revisão de dados'); // fila 0 não aparece
    expect(screen.getByText(s.ingestionGap)).toBeTruthy();
    expect(screen.getByTestId('admin-hub-index')).toBeTruthy();
  });
});
