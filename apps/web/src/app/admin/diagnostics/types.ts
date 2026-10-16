/**
 * Tipos do painel de DIAGNÓSTICO (/admin/diagnostics).
 *
 * Espelham o payload de GET /api/v1/admin/diagnostics
 * (apps/api/src/modules/admin/diagnostics.routes.ts). Ficam na própria pasta da
 * rota, como em /admin/metricas.
 */

export type FlagOwner = 'api' | 'web' | 'worker';

export interface DiagnosticFlagView {
  key: string;
  owner: FlagOwner;
  kind: 'env' | 'derived';
  scope: string;
  effectOn: string;
  effectOff: string;
  defaultOn: boolean;
  change: string;
  source: string;
  drift: string | null;
  /** Valor efetivo lido AGORA. `null` = flag de outro processo (a API não lê o ambiente de fora). */
  value: boolean | null;
  raw: string | null;
  unavailableReason: string | null;
}

export interface FeatureFlagPackageReport {
  module: string;
  persistence: string;
  hasPersistedOverride: boolean;
  consumedByRuntime: boolean;
  flags: Array<{ key: string; minimumPlan: string }>;
  note: string;
}

export interface SchedulerItemView {
  queue: string;
  id: string | null;
  name: string;
  pattern: string | null;
  everyMs: number | null;
  nextRunAt: string | null;
}

export interface UploadPolicyView {
  maxBytes: number;
  allowedMimes: string[];
  bucket: string;
  publicUrlConfigured: boolean;
  /** `null` = a API NÃO tem rota de listagem de assets (lacuna declarada na tela). */
  listingEndpoint: null;
  routes: Array<{ method: 'POST'; path: string; permission: string; folder: string }>;
}

export interface AdminDiagnosticsPayload {
  generatedAt: string;
  processes: {
    api: {
      service: 'api';
      nodeEnv: string;
      commit: string | null;
      uptimeSeconds: number;
      startedAt: string;
      schedulerEnabled: boolean;
      redisConfigured: boolean;
    };
  };
  flags: DiagnosticFlagView[];
  featureFlagPackage: FeatureFlagPackageReport;
  schedulers: { error: string | null; items: SchedulerItemView[] };
  upload: UploadPolicyView;
  notes: string[];
}

/**
 * Flags do processo WEB, lidas no servidor do Next (a API não as enxerga). Mapa
 * `nome → valor` montado em `page.tsx` com leitura ESTÁTICA (sem indexação
 * dinâmica de `process.env`).
 */
export interface WebProcessView {
  nodeEnv: string | null;
  commit: string | null;
  deployment: string | null;
  flags: Record<string, boolean>;
}
