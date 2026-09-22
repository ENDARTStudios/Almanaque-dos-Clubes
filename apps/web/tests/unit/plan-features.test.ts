/**
 * T465 — Contrato da oferta: o /checkout consome a FONTE ÚNICA de recursos
 * (plan-features.ts) e o catálogo cumpre as regras de honestidade:
 *  - nada de "ilimitado" sem alcance definido (política do próprio /planos);
 *  - recurso não-operacional só aparece com o marcador "(em breve)";
 *  - o /checkout NÃO hardcodа listas paralelas (a divergência era o bug).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLAN_FEATURES } from '../../src/lib/plan-features.js';

const checkoutPage = readFileSync(
  new URL('../../src/app/checkout/page.tsx', import.meta.url),
  'utf8',
);

describe('T465 — catálogo de oferta honesto (fonte única)', () => {
  it('PRO e ELITE existem e ELITE inclui tudo do PRO por referência', () => {
    expect(Object.keys(PLAN_FEATURES).sort()).toEqual(['ELITE', 'PRO']);
    expect(PLAN_FEATURES.ELITE[0]).toBe('Tudo do Pro');
  });

  it('nenhum recurso promete "ilimitado" sem alcance (política do /planos)', () => {
    for (const features of Object.values(PLAN_FEATURES)) {
      for (const f of features) {
        expect(f.toLowerCase()).not.toContain('ilimitad');
      }
    }
  });

  it('recurso não-operacional só aparece com o marcador "(em breve)"', () => {
    const emBreve = ['IA assistida com citações', 'API de dados'];
    for (const name of emBreve) {
      const proHit = PLAN_FEATURES.PRO.find((f) => f.startsWith(name));
      const eliteHit = PLAN_FEATURES.ELITE.find((f) => f.startsWith(name));
      for (const hit of [proHit, eliteHit]) {
        if (hit) expect(hit).toContain('(em breve)');
      }
    }
    // IA está no Pro — o dispatch exige que ela NÃO apareça sem o marcador.
    expect(PLAN_FEATURES.PRO.some((f) => f.includes('IA assistida com citações (em breve)'))).toBe(
      true,
    );
  });

  it('KG (promessa do Escopo 6.6, agora verdade) está declarado na ELITE como entregue', () => {
    expect(PLAN_FEATURES.ELITE.some((f) => f.includes('Grafo do conhecimento'))).toBe(true);
    expect(PLAN_FEATURES.ELITE.some((f) => f.includes('fonte auditável'))).toBe(true);
  });

  it('o /checkout consome a fonte única e não hardcodа listas paralelas', () => {
    expect(checkoutPage).toContain("from '@/lib/plan-features'");
    expect(checkoutPage).toContain('PLAN_FEATURES');
    // Strings que só existiriam em lista hardcodada (contrato anti-divergência):
    expect(checkoutPage).not.toContain('>Busca avançada ilimitada<');
    expect(checkoutPage).not.toContain('>IA assistida com citações<');
    expect(checkoutPage).not.toContain('>API com limites estendidos<');
  });

  it('preço/periodicidade NÃO vivem no catálogo de recursos (são decisão do Operador)', () => {
    for (const features of Object.values(PLAN_FEATURES)) {
      for (const f of features) {
        expect(f).not.toMatch(/R\$|\d+,\d{2}|mensal|anual/i);
      }
    }
  });
});
