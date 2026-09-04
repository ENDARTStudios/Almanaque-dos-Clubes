/**
 * T422 — Avaliacao de alertas (regras de sondagem da observabilidade).
 * Puro e testavel: recebe um snapshot de metricas e retorna os alertas disparados.
 * O envio (webhook) e feito pelo chamador; aqui so decidimos o quê. Nenhum PII.
 */

export interface AlertSnapshot {
  httpRequests5xx: number;
  httpRequestsTotal: number;
  authFailuresLastMinute: number;
  backupLastOk: boolean;
  diskUsagePercent: number;
}

export interface AlertRule {
  id: string;
  description: string;
  severity: 'warning' | 'critical';
  isTriggered: (s: AlertSnapshot) => boolean;
}

export interface AlertEvaluation {
  id: string;
  description: string;
  severity: 'warning' | 'critical';
}

/** Regras: taxa de 5xx > 1%, falhas de auth > 50/min, backup falhou, disco > 80%. */
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'http_5xx_rate',
    description: 'Taxa de respostas 5xx acima de 1%',
    severity: 'critical',
    isTriggered: (s) => s.httpRequestsTotal > 0 && s.httpRequests5xx / s.httpRequestsTotal > 0.01,
  },
  {
    id: 'auth_failures',
    description: 'Falhas de autenticacao acima de 50 por minuto',
    severity: 'critical',
    isTriggered: (s) => s.authFailuresLastMinute > 50,
  },
  {
    id: 'backup_failed',
    description: 'Backup automatico falhou na ultima execucao',
    severity: 'warning',
    isTriggered: (s) => !s.backupLastOk,
  },
  {
    id: 'disk_usage',
    description: 'Uso de disco acima de 80%',
    severity: 'warning',
    isTriggered: (s) => s.diskUsagePercent > 80,
  },
];

/** Avalia as regras contra um snapshot; retorna so os alertas disparados. */
export function evaluateAlerts(snapshot: AlertSnapshot): AlertEvaluation[] {
  return ALERT_RULES.filter((r) => r.isTriggered(snapshot)).map((r) => ({
    id: r.id,
    description: r.description,
    severity: r.severity,
  }));
}

/** Monta o payload JSON do webhook (Slack/Discord/email). */
export function renderAlertPayload(alerts: AlertEvaluation[]): string {
  return JSON.stringify({
    source: 'almanaque-dos-clubes',
    ts: new Date().toISOString(),
    alerts: alerts.map((a) => ({ id: a.id, description: a.description, severity: a.severity })),
  });
}
