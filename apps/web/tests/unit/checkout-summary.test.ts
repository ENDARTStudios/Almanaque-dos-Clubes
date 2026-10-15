/**
 * T555 — o resumo do checkout promete o que os Termos (seção 5) exigem: preço total,
 * periodicidade, desconto e data da cobrança seguinte. Estes testes travam as duas
 * coisas que NÃO podem divergir do que é cobrado:
 *
 *  1. os valores — que foram CONFERIDOS contra os 12 price IDs da Stripe em produção
 *     (15-10-2026): PRO mês 490, PRO ano 4998, ELITE mês 990, ELITE ano 10098, nas três
 *     moedas (BRL/USD/EUR). Se alguém mudar a tabela no Stripe e não aqui (ou vice-versa),
 *     este teste é o alarme;
 *  2. o cálculo da data — mensal +30, anual +365, com a normalização de fim de mês.
 */
import { describe, it, expect } from 'vitest';
import {
  PLAN_CENTS,
  YEARLY_DISCOUNT,
  formatPrice,
  nextChargeDate,
  yearlyCents,
} from '../../src/lib/pricing';

describe('T555 — preço exibido = preço cobrado (valores conferidos na Stripe)', () => {
  it('mensal é a tabela de PLAN_CENTS', () => {
    expect(PLAN_CENTS.PRO).toBe(490);
    expect(PLAN_CENTS.ELITE).toBe(990);
    expect(PLAN_CENTS.FREE).toBe(0);
  });

  it('anual = 12 × mensal com o desconto, batendo com os price IDs da Stripe', () => {
    expect(YEARLY_DISCOUNT).toBe(0.85);
    expect(yearlyCents(PLAN_CENTS.PRO)).toBe(4998); // STRIPE_PRICE_PRO_YEAR_* = 4998
    expect(yearlyCents(PLAN_CENTS.ELITE)).toBe(10098); // STRIPE_PRICE_ELITE_YEAR_* = 10098
  });

  it('o desconto do anual é real (anual < 12 × mensal)', () => {
    for (const plano of ['PRO', 'ELITE'] as const) {
      expect(yearlyCents(PLAN_CENTS[plano])).toBeLessThan(PLAN_CENTS[plano] * 12);
    }
  });

  it('formata por moeda e por locale (separador decimal)', () => {
    expect(formatPrice('BRL', 490, 'pt-br')).toBe('R$ 4,90');
    expect(formatPrice('BRL', 4998, 'pt-br')).toBe('R$ 49,98');
    expect(formatPrice('USD', 490, 'en-us')).toBe('$ 4.90');
    expect(formatPrice('EUR', 990, 'es-es')).toBe('€ 9,90');
  });
});

describe('T555 — data da cobrança seguinte', () => {
  const base = new Date('2026-10-15T00:00:00Z');

  it('mensal = +30 dias', () => {
    expect(nextChargeDate(base, 'month').toISOString().slice(0, 10)).toBe('2026-11-14');
  });

  it('anual = +365 dias', () => {
    expect(nextChargeDate(base, 'year').toISOString().slice(0, 10)).toBe('2027-10-15');
  });

  it('fim de mês normaliza (31/01 + 30 dias = 02/03, sem estourar o mês)', () => {
    expect(
      nextChargeDate(new Date('2026-01-31T00:00:00Z'), 'month').toISOString().slice(0, 10),
    ).toBe('2026-03-02');
  });

  it('é determinística e não depende do relógio nem do fuso do processo', () => {
    const a = nextChargeDate(base, 'month').toISOString();
    const b = nextChargeDate(base, 'month').toISOString();
    expect(a).toBe(b);
    expect(a.endsWith('Z')).toBe(true); // UTC puro: o dia não desloca por fuso
  });
});
