/**
 * T465/T472a — Contrato da oferta: o /checkout consome a FONTE ÚNICA de recursos
 * (plan-features.ts) e o catálogo cumpre as regras de honestidade EM TODOS OS
 * IDIOMAS (pt/en/es): sem "ilimitado/unlimited"; não-operacional só com marcador
 * de "em breve" no idioma; /checkout sem listas paralelas.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLAN_FEATURES, COMING_SOON_MARKERS } from '../../src/lib/plan-features.js';

const LOCALES = ['pt-br', 'en-us', 'es-es'] as const;
const ELITE_FIRST: Record<string, string> = {
  'pt-br': 'Tudo do Pro',
  'en-us': 'Everything in Pro',
  'es-es': 'Todo lo del Pro',
};
const checkoutConsumer = readFileSync(
  new URL('../../src/components/CheckoutSummary.tsx', import.meta.url),
  'utf8',
);

describe('T465/T472a — catálogo de oferta honesto (fonte única, multi-idioma)', () => {
  it('todas as locales têm PRO e ELITE; ELITE inclui tudo do PRO', () => {
    for (const loc of LOCALES) {
      expect(Object.keys(PLAN_FEATURES[loc]).sort()).toEqual(['ELITE', 'PRO']);
      expect(PLAN_FEATURES[loc].ELITE[0]).toBe(ELITE_FIRST[loc]);
    }
  });

  it('nenhum idioma promete "ilimitado/unlimited"', () => {
    for (const loc of LOCALES) {
      for (const features of Object.values(PLAN_FEATURES[loc])) {
        for (const f of features) {
          expect(f.toLowerCase()).not.toMatch(/ilimitad|unlimited/);
        }
      }
    }
  });

  it('recurso não-operacional (IA/API) só aparece com marcador de "em breve" no idioma', () => {
    for (const loc of LOCALES) {
      for (const features of Object.values(PLAN_FEATURES[loc])) {
        for (const f of features) {
          if (/IA |AI-|IA asistida/.test(f)) {
            expect(COMING_SOON_MARKERS.some((mk) => f.includes(mk))).toBe(true);
          }
          if (/API de datos|Data API/.test(f)) {
            expect(COMING_SOON_MARKERS.some((mk) => f.includes(mk))).toBe(true);
          }
        }
      }
    }
  });

  it('o /checkout (CheckoutSummary) consome a fonte única e não hardcoda listas paralelas', () => {
    expect(checkoutConsumer).toContain('plan-features');
    expect(checkoutConsumer).toContain('PLAN_FEATURES');
    expect(checkoutConsumer).not.toContain('>Busca avançada ilimitada<');
    expect(checkoutConsumer).not.toContain('>IA assistida com citações<');
  });

  it('preço/periodicidade NÃO vivem no catálogo (decisão do Operador)', () => {
    for (const loc of LOCALES) {
      for (const features of Object.values(PLAN_FEATURES[loc])) {
        for (const f of features) {
          expect(f).not.toMatch(/R\$|\d+,\d{2}|mensal|anual|monthly|yearly/i);
        }
      }
    }
  });
});
