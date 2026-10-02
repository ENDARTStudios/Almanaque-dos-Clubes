import type { Locale } from './config';

/**
 * WS-O-1 — strings do painel de observabilidade (/admin/observability).
 * Módulo ADITIVO (não altera o Dictionary global); consumido por Client Components.
 */
export interface WsO1Strings {
  observability: {
    title: string;
    subtitle: string;
    restricted: string;
    loading: string;
    refresh: string;
    lastUpdated: string;
    schedulerOn: string;
    schedulerOff: string;
    schedules: string;
    queue: string;
    queueWaiting: string;
    queueActive: string;
    queueCompleted: string;
    queueFailed: string;
    queueDelayed: string;
    jobLastRun: string;
    jobNeverRun: string;
    jobSuccess: string;
    jobFailure: string;
    jobDuration: string;
    alerts: string;
    alertsNone: string;
    backlog: string;
    integrityDrift: string;
    logs: string;
    logsQueue: string;
    logsEmpty: string;
    slo: string;
    sloMet: string;
    sloMissed: string;
    sloUnknown: string;
  };
}

export const wsO1Strings: Record<Locale, WsO1Strings> = {
  'pt-br': {
    observability: {
      title: 'Observabilidade',
      subtitle: 'Crons ativos, fila e alertas internos — telemetria 100% interna.',
      restricted: 'Acesso restrito a administradores.',
      loading: 'Carregando…',
      refresh: 'Atualizar',
      lastUpdated: 'Atualizado em',
      schedulerOn: 'Scheduler ativo',
      schedulerOff: 'Scheduler desligado',
      schedules: 'Agendas (UTC)',
      queue: 'Fila data-refresh',
      queueWaiting: 'Esperando',
      queueActive: 'Ativos',
      queueCompleted: 'Completados',
      queueFailed: 'Falhados',
      queueDelayed: 'Agendados',
      jobLastRun: 'Último run',
      jobNeverRun: 'Nunca rodou',
      jobSuccess: 'Sucessos',
      jobFailure: 'Falhas',
      jobDuration: 'Duração',
      alerts: 'Alertas',
      alertsNone: 'Nenhum alerta ativo',
      backlog: 'Backlog acima do limite',
      integrityDrift: 'Deriva de integridade',
      logs: 'Logs recentes',
      logsQueue: 'Histórico da fila (Redis)',
      logsEmpty: 'Sem logs ainda',
      slo: 'SLOs (aspiracionais)',
      sloMet: 'Dentro do alvo',
      sloMissed: 'Fora do alvo',
      sloUnknown: 'Sem medição ainda',
    },
  },
  'en-us': {
    observability: {
      title: 'Observability',
      subtitle: 'Active crons, queue and internal alerts — 100% internal telemetry.',
      restricted: 'Restricted to administrators.',
      loading: 'Loading…',
      refresh: 'Refresh',
      lastUpdated: 'Updated at',
      schedulerOn: 'Scheduler enabled',
      schedulerOff: 'Scheduler disabled',
      schedules: 'Schedules (UTC)',
      queue: 'data-refresh queue',
      queueWaiting: 'Waiting',
      queueActive: 'Active',
      queueCompleted: 'Completed',
      queueFailed: 'Failed',
      queueDelayed: 'Scheduled',
      jobLastRun: 'Last run',
      jobNeverRun: 'Never ran',
      jobSuccess: 'Successes',
      jobFailure: 'Failures',
      jobDuration: 'Duration',
      alerts: 'Alerts',
      alertsNone: 'No active alerts',
      backlog: 'Backlog above threshold',
      integrityDrift: 'Integrity drift',
      logs: 'Recent logs',
      logsQueue: 'Queue history (Redis)',
      logsEmpty: 'No logs yet',
      slo: 'SLOs (aspirational)',
      sloMet: 'Within target',
      sloMissed: 'Outside target',
      sloUnknown: 'No measurement yet',
    },
  },
  'es-es': {
    observability: {
      title: 'Observabilidad',
      subtitle: 'Crons activos, cola y alertas internas — telemetría 100% interna.',
      restricted: 'Acceso restringido a administradores.',
      loading: 'Cargando…',
      refresh: 'Actualizar',
      lastUpdated: 'Actualizado el',
      schedulerOn: 'Scheduler activo',
      schedulerOff: 'Scheduler apagado',
      schedules: 'Agendas (UTC)',
      queue: 'Cola data-refresh',
      queueWaiting: 'Esperando',
      queueActive: 'Activos',
      queueCompleted: 'Completados',
      queueFailed: 'Fallidos',
      queueDelayed: 'Agendados',
      jobLastRun: 'Última ejecución',
      jobNeverRun: 'Nunca ejecutó',
      jobSuccess: 'Éxitos',
      jobFailure: 'Fallos',
      jobDuration: 'Duración',
      alerts: 'Alertas',
      alertsNone: 'Ninguna alerta activa',
      backlog: 'Backlog por encima del límite',
      integrityDrift: 'Deriva de integridad',
      logs: 'Logs recientes',
      logsQueue: 'Historial de la cola (Redis)',
      logsEmpty: 'Sin logs aún',
      slo: 'SLOs (aspiracionales)',
      sloMet: 'Dentro del objetivo',
      sloMissed: 'Fuera del objetivo',
      sloUnknown: 'Sin medición aún',
    },
  },
};
