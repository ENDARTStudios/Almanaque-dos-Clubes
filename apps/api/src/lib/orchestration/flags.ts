/**
 * WS-G-1 — Feature flags da orquestração. DEFAULT OFF (fail-safe).
 * Enquanto desligadas, nenhum scheduler/worker de ETL roda em produção.
 */
export function orchestrationEnabled(): boolean {
  return process.env.ORCHESTRATION_ENABLED === 'true';
}

export function schedulerEnabled(): boolean {
  return process.env.ETL_SCHEDULER_ENABLED === 'true';
}

/** O modo dry-run é o ÚNICO suportado por esta camada; apply exige pipeline gated separado. */
export function applyEnabled(): boolean {
  // Sempre false neste scaffolding — trava dura contra escrita acidental.
  return false;
}
