/**
 * T538 — o contrato da lista de clubes ingeridos: QID válido, único, e país de
 * duas letras (o mesmo shape que o acervo usa). A lista é CURADA e derivada de
 * artigo (regra D-2026-10-09: nunca QID de memória) — este teste evita o erro
 * bobo de digitar um QID repetido ou num formato inválido.
 */
import { describe, expect, it } from 'vitest';
import { ABSENT_CLUBS } from '../../../src/scripts/seed-absent-clubs-t538.js';

describe('T538 — lista de clubes ausentes ingeridos', () => {
  it('todo QID é válido (Q + dígitos) e único na lista', () => {
    for (const c of ABSENT_CLUBS) expect(c.qid).toMatch(/^Q\d+$/);
    const qids = ABSENT_CLUBS.map((c) => c.qid);
    expect(new Set(qids).size).toBe(qids.length);
  });

  it('país é ISO de 2 letras e o nome é não-vazio', () => {
    for (const c of ABSENT_CLUBS) {
      expect(c.country).toMatch(/^[A-Z]{2}$/);
      expect(c.name.trim().length).toBeGreaterThan(3);
    }
  });

  it('cobre as competências que geraram os gaps do T529 (ES, IT, BR, AR, EC, VE, BO)', () => {
    const paises = new Set(ABSENT_CLUBS.map((c) => c.country));
    for (const p of ['ES', 'IT', 'BR', 'AR', 'EC', 'VE', 'BO']) expect(paises.has(p)).toBe(true);
  });
});
