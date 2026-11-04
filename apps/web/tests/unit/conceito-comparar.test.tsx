// @vitest-environment jsdom
/**
 * /compare no conceito FICHA — a leitura horizontal.
 *
 * O que protege: cada linha é número A · métrica · número B; quem lidera fica em carmim;
 * lacuna (null) vira "—" e nunca 0; o ano de fundação não ganha "líder" (não é uma disputa).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CompareRows from '@/components/conceito/comparar/CompareRows';

afterEach(cleanup);

const rows = [
  { label: 'Títulos oficiais', a: 48, b: 42, leader: 'a' as const },
  { label: 'Mundial', a: 1, b: 0, leader: 'a' as const },
  { label: 'Fundação', a: 1895, b: null, leader: null },
];

describe('CompareRows', () => {
  it('lê na horizontal com líder em carmim e lacuna declarada', () => {
    render(<CompareRows rows={rows} locale="pt-br" label="Comparar" />);
    const itens = screen.getAllByRole('listitem');
    expect(itens).toHaveLength(3);
    expect(itens[0].textContent).toContain('48');
    expect(itens[0].textContent).toContain('Títulos oficiais');
    expect(itens[0].textContent).toContain('42');
    expect(itens[1].textContent).toContain('0'); // zero real não vira lacuna
    expect(itens[2].textContent).toContain('—');
    // líder (48) em carmim; o 42 não.
    expect(itens[0].querySelectorAll('.text-primary-ink')).toHaveLength(1);
  });
});
