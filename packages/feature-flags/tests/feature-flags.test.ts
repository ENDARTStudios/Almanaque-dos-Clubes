import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureFlag,
  setFeatureFlag,
  isFeatureEnabled,
  resetFeatureFlags,
  getMinimumPlanForFeature,
} from '../src/index.js';

describe('feature-flags', () => {
  beforeEach(() => {
    resetFeatureFlags();
  });

  it('retorna false para flag nunca definida', () => {
    expect(isFeatureEnabled(FeatureFlag.EXPORT_CSV)).toBe(false);
  });

  it('habilita e consulta uma flag', () => {
    setFeatureFlag(FeatureFlag.ADVANCED_SEARCH, true);
    expect(isFeatureEnabled(FeatureFlag.ADVANCED_SEARCH)).toBe(true);
  });

  it('desabilita uma flag previamente habilitada', () => {
    setFeatureFlag(FeatureFlag.API_KEYS, true);
    setFeatureFlag(FeatureFlag.API_KEYS, false);
    expect(isFeatureEnabled(FeatureFlag.API_KEYS)).toBe(false);
  });

  it('reset limpa todas as flags', () => {
    setFeatureFlag(FeatureFlag.WEBHOOKS, true);
    setFeatureFlag(FeatureFlag.BULK_IMPORT, true);
    resetFeatureFlags();
    expect(isFeatureEnabled(FeatureFlag.WEBHOOKS)).toBe(false);
    expect(isFeatureEnabled(FeatureFlag.BULK_IMPORT)).toBe(false);
  });

  it('getMinimumPlanForFeature retorna plano mínimo correto', () => {
    expect(getMinimumPlanForFeature(FeatureFlag.EXPORT_CSV)).toBe('PRO');
    expect(getMinimumPlanForFeature(FeatureFlag.KNOWLEDGE_GRAPH)).toBe('ELITE');
    expect(getMinimumPlanForFeature(FeatureFlag.BULK_IMPORT)).toBe('ADMIN');
  });

  it('getMinimumPlanForFeature retorna FREE para feature sem mapeamento', () => {
    expect(getMinimumPlanForFeature(FeatureFlag.BETA_FEATURE_X)).toBe('FREE');
  });
});
