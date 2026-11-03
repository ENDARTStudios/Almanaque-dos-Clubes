// @vitest-environment jsdom
/**
 * DataTable — as três garantias que ela existe para dar.
 *
 * ── O QUE ESTE TESTE PROTEGE ────────────────────────────────────────────────────────────────
 * O conceito inteiro se apoia numa tabela: 1.932 competições, 17.265 partidas. Três regras fazem
 * essa tabela ser legível, e as três são fáceis de perder num ajuste de classe:
 *
 *   1. NÚMERO À DIREITA. Alinhado à esquerda, o olho lê dígito por dígito em vez de comparar
 *      magnitude. É a diferença entre uma coluna de pontos e uma lista de números.
 *   2. `tabular-nums`. Na proporcional, "111" é mais estreito que "888" — as colunas dançam
 *      linha a linha. Sem isso o alinhamento à direita é decorativo.
 *   3. ZEBRA por degrau de tom, não por borda em toda célula.
 *
 * E a semântica: `<caption>`, `<th scope="col">` e `<tbody>` de verdade. Uma grade de `div` não
 * anuncia a coluna de cada célula ao leitor de tela.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import DataTable from '@/components/ficha/DataTable';

afterEach(cleanup);

const COLUNAS = [
  { header: 'Clube', align: 'left' as const },
  { header: 'Pontos', align: 'right' as const },
];

const LINHAS = [
  ['Liverpool', '84'],
  ['Arsenal', '74'],
  ['Chelsea', '69'],
];

describe('DataTable', () => {
  it('é uma tabela de verdade, com caption e th com scope', () => {
    render(<DataTable columns={COLUNAS} rows={LINHAS} caption="Classificação final" />);

    expect(screen.getByRole('table')).toBeTruthy();
    const caption = screen.getByText('Classificação final');
    expect(caption.tagName).toBe('CAPTION');

    const ths = screen.getAllByRole('columnheader');
    expect(ths).toHaveLength(2);
    ths.forEach((th) => expect(th.getAttribute('scope')).toBe('col'));
  });

  it('número à direita com tabular-nums; texto à esquerda sem', () => {
    render(<DataTable columns={COLUNAS} rows={LINHAS} caption="c" />);

    const celula84 = screen.getByText('84');
    expect(celula84.className).toContain('text-right');
    expect(celula84.getAttribute('style')).toContain('tabular-nums');

    const celulaClube = screen.getByText('Liverpool');
    expect(celulaClube.className).toContain('text-left');
    // texto não recebe tabular-nums: só número precisa de largura fixa
    expect(celulaClube.getAttribute('style')).toBeNull();
  });

  it('aplica zebra nas linhas ímpares', () => {
    const { container } = render(<DataTable columns={COLUNAS} rows={LINHAS} caption="c" />);
    const linhas = Array.from(container.querySelectorAll('tbody tr'));

    expect(linhas[0].className).not.toContain('bg-surface-2');
    expect(linhas[1].className).toContain('bg-surface-2');
    expect(linhas[2].className).not.toContain('bg-surface-2');
  });

  it('emphasisRows destaca as primeiras N em peso, não em cor', () => {
    render(<DataTable columns={COLUNAS} rows={LINHAS} caption="c" emphasisRows={2} />);

    expect(screen.getByText('Liverpool').className).toContain('font-semibold');
    expect(screen.getByText('Arsenal').className).toContain('font-semibold');
    expect(screen.getByText('Chelsea').className).not.toContain('font-semibold');
  });

  it('sem showCaption a legenda fica só para o leitor de tela', () => {
    render(<DataTable columns={COLUNAS} rows={LINHAS} caption="Classificação final" />);
    expect(screen.getByText('Classificação final').className).toContain('sr-only');
  });

  it('com showCaption a legenda fica visível', () => {
    render(<DataTable columns={COLUNAS} rows={LINHAS} caption="Classificação final" showCaption />);
    expect(screen.getByText('Classificação final').className).not.toContain('sr-only');
  });
});
