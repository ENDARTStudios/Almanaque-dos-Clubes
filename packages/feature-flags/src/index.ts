export const FeatureFlag = {
  EXPORT_CSV: 'export_csv',
  ADVANCED_SEARCH: 'advanced_search',
  API_KEYS: 'api_keys',
  KNOWLEDGE_GRAPH: 'knowledge_graph',
  WEBHOOKS: 'webhooks',
  BULK_IMPORT: 'bulk_import',
  BETA_FEATURE_X: 'beta_feature_x',
} as const;

export type FeatureFlagName = (typeof FeatureFlag)[keyof typeof FeatureFlag];

const featureStore = new Map<string, boolean>();

export function setFeatureFlag(name: FeatureFlagName, enabled: boolean): void {
  featureStore.set(name, enabled);
}

export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return featureStore.get(name) ?? false;
}

export function resetFeatureFlags(): void {
  featureStore.clear();
}

/**
 * Feature gating por plano: verifica se o plano do usuário libera a feature.
 * Cada feature tem um plano mínimo requerido.
 */
const FEATURE_PLAN_MAP: Partial<Record<FeatureFlagName, 'FREE' | 'PRO' | 'ELITE' | 'ADMIN'>> = {
  [FeatureFlag.EXPORT_CSV]: 'PRO',
  [FeatureFlag.ADVANCED_SEARCH]: 'PRO',
  [FeatureFlag.API_KEYS]: 'ELITE',
  [FeatureFlag.KNOWLEDGE_GRAPH]: 'ELITE',
  [FeatureFlag.WEBHOOKS]: 'ELITE',
  [FeatureFlag.BULK_IMPORT]: 'ADMIN',
};

export function getMinimumPlanForFeature(name: FeatureFlagName): string {
  return FEATURE_PLAN_MAP[name] ?? 'FREE';
}
