import { describe, it, expect } from 'vitest';
import { resolveScripts, choiceAllOptional, type ScriptDescriptor } from '../../src/lib/consent';

// Registry-fixture espelhando o cenário real do T436: entradas necessárias
// (primeira-party) + vendors opcionais futuros (analytics/marketing). O gate
// sob teste é o mesmo usado em produção — troca-se só o registro injetado.
const REGISTRY: ScriptDescriptor[] = [
  { id: 'session', category: 'necessary', src: 'first-party:session' },
  { id: 'auth', category: 'necessary', src: 'first-party:auth' },
  { id: 'csrf', category: 'necessary', src: 'first-party:csrf' },
  { id: 'analytics-vendor', category: 'analytics', src: 'https://example.com/analytics.js' },
  { id: 'marketing-vendor', category: 'marketing', src: 'https://example.com/marketing.js' },
];

describe('script loader — gate por consentimento (T436)', () => {
  it('analytics NÃO carrega antes do consentimento', () => {
    const scripts = resolveScripts(null, REGISTRY);
    expect(scripts.some((s) => s.category === 'analytics')).toBe(false);
    expect(scripts.some((s) => s.id === 'analytics-vendor')).toBe(false);
  });

  it('marketing NÃO carrega antes do consentimento', () => {
    const scripts = resolveScripts(null, REGISTRY);
    expect(scripts.some((s) => s.category === 'marketing')).toBe(false);
    expect(scripts.some((s) => s.id === 'marketing-vendor')).toBe(false);
  });

  it('necessários SEMPRE carregam (sessão, auth, CSRF) — sem escolha, recusa ou aceite', () => {
    for (const choice of [null, choiceAllOptional(false), choiceAllOptional(true)]) {
      const scripts = resolveScripts(choice, REGISTRY);
      for (const id of ['session', 'auth', 'csrf']) {
        expect(scripts.some((s) => s.id === id)).toBe(true);
      }
    }
  });

  it('após "Aceitar todos opcionais" ambos carregam; após "Rejeitar opcionais" nenhum opcional carrega', () => {
    const accepted = resolveScripts(choiceAllOptional(true), REGISTRY);
    expect(accepted.some((s) => s.id === 'analytics-vendor')).toBe(true);
    expect(accepted.some((s) => s.id === 'marketing-vendor')).toBe(true);

    const rejected = resolveScripts(choiceAllOptional(false), REGISTRY);
    expect(rejected.some((s) => s.category === 'analytics')).toBe(false);
    expect(rejected.some((s) => s.category === 'marketing')).toBe(false);
    // Recusa mantém os necessários intactos (recusa nunca quebra o essencial).
    expect(rejected.some((s) => s.id === 'session')).toBe(true);
  });
});
