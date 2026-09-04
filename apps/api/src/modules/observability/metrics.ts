/**
 * T422 — Registry de metricas Prometheus (sem dependencia externa).
 * Expõe contadores via formato de exposicao Prometheus (texto). 'renderPrometheus'
 * e puro; o registry e o ponto unico onde a API incrementa (requisicoes, 5xx, falhas
 * de auth, latencia). Nenhum dado sensivel e registrado (apenas metodo/status).
 */

export interface MetricLabels {
  [k: string]: string;
}

export interface MetricSample {
  name: string;
  help: string;
  value: number;
  labels: MetricLabels;
}

const EMPTY: MetricLabels = {};

function labelKey(labels: MetricLabels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  return keys.map((k) => k + '=' + labels[k]).join(',');
}

export interface MetricsRegistry {
  inc(name: string, labels: MetricLabels | undefined, delta?: number): void;
  set(name: string, labels: MetricLabels | undefined, value: number): void;
  snapshot(name: string): MetricSample[];
  all(): MetricSample[];
}

function findEntry(
  list: MetricSample[],
  name: string,
  labels: MetricLabels,
): MetricSample | undefined {
  const want = labelKey(labels);
  for (const e of list) {
    if (e.name === name && labelKey(e.labels) === want) return e;
  }
  return undefined;
}

export function createMetricsRegistry(): MetricsRegistry {
  const store: MetricSample[] = [];
  const inc = (name: string, labels: MetricLabels | undefined, delta = 1): void => {
    const lbl = labels ?? EMPTY;
    const existing = findEntry(store, name, lbl);
    if (existing) {
      existing.value += delta;
    } else {
      store.push({ name, help: name, value: delta, labels: { ...lbl } });
    }
  };
  const set = (name: string, labels: MetricLabels | undefined, value: number): void => {
    const lbl = labels ?? EMPTY;
    const existing = findEntry(store, name, lbl);
    if (existing) {
      existing.value = value;
    } else {
      store.push({ name, help: name, value, labels: { ...lbl } });
    }
  };
  const snapshot = (name: string): MetricSample[] => store.filter((e) => e.name === name);
  const all = (): MetricSample[] => store.map((e) => ({ ...e, labels: { ...e.labels } }));
  return { inc, set, snapshot, all };
}

/** Escapa valor de label (labels controladas ASCII; identidade e suficiente). */
function escapeLabel(v: string): string {
  return v;
}

export function formatLabels(labels: MetricLabels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  return '{' + keys.map((k) => k + '="' + escapeLabel(labels[k]) + '"').join(',') + '}';
}

/** Renderiza o registry no formato de exposicao Prometheus (texto). Puro/testavel. */
export function renderPrometheus(entries: MetricSample[]): string {
  const lines: string[] = [];
  for (const e of entries) {
    lines.push('# TYPE ' + e.name + ' counter');
    lines.push('# HELP ' + e.name + ' ' + e.help);
    lines.push(e.name + formatLabels(e.labels) + ' ' + e.value);
  }
  return lines.join('\n') + (lines.length ? '\n' : '');
}

/** Singleton usado pela API (requisicoes, 5xx, auth, latencia). */
export const metrics = createMetricsRegistry();
