import { describe, it, expect } from 'vitest';
import { rankingNameFor } from '../../../src/modules/rankings/ranking-naming.js';

// T521 — o nome do ranking precisa distinguir os escopos de um mesmo ano.
describe('rankingNameFor (T521)', () => {
  it('inclui a competição quando o ranking é de uma competição', () => {
    expect(rankingNameFor('2023', 'men', 'Campeonato Brasileiro Série A')).toBe(
      'Ranking 0-100 Campeonato Brasileiro Série A 2023 — Masculino',
    );
  });

  it('sem competição é o agregado geral (todos os clubes do ano)', () => {
    expect(rankingNameFor('2023', 'men')).toBe('Ranking 0-100 2023 — Masculino');
    expect(rankingNameFor('2024', 'men', null)).toBe('Ranking 0-100 2024 — Masculino');
  });

  it('rotula o gênero feminino', () => {
    expect(rankingNameFor('2026', 'women')).toBe('Ranking 0-100 2026 — Feminino');
  });

  it('mantém o formato antigo do agregado (compatibilidade com o já publicado)', () => {
    // O ranking global de 2026 publicado em 22-09 usa exatamente este nome.
    expect(rankingNameFor('2026', 'men')).toBe('Ranking 0-100 2026 — Masculino');
  });
});
