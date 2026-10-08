// T072 — Comparadores avançados: normalização para o gráfico radar.
//
// Regra de honestidade: normalizar NÃO é inventar. Cada eixo é escalado pelo
// MAIOR valor do par (líder = 100). Eixo com dado ausente em qualquer lado
// (ou zero nos dois) fica FORA do radar — "sem dado" nunca vira 0 plotável.

export interface RadarMetricInput {
  /** Chave estável do eixo (ex.: 'titles', 'ranking', 'history', 'stadium'). */
  key: string;
  /** Rótulo já localizado (i18n) exibido no eixo. */
  label: string;
  a: number | null;
  b: number | null;
}

export interface RadarPoint {
  key: string;
  label: string;
  /** Valor normalizado 0–100 (1 casa decimal). */
  a: number;
  b: number;
  /** Valores brutos do acervo, para tooltip/auditoria. */
  rawA: number;
  rawB: number;
}

export interface RadarResult {
  points: RadarPoint[];
  /** Rótulos dos eixos excluídos por falta de dado (declarado na UI). */
  excluded: string[];
}

export function buildRadarData(metrics: RadarMetricInput[]): RadarResult {
  const points: RadarPoint[] = [];
  const excluded: string[] = [];

  for (const m of metrics) {
    if (m.a === null || m.b === null) {
      excluded.push(m.label);
      continue;
    }
    const max = Math.max(m.a, m.b);
    if (max <= 0) {
      excluded.push(m.label);
      continue;
    }
    // Empate no máximo ⇒ ambos no topo (100) — líder indeterminado.
    const norm = (v: number): number => Math.round((v / max) * 1000) / 10;
    points.push({
      key: m.key,
      label: m.label,
      a: norm(m.a),
      b: norm(m.b),
      rawA: m.a,
      rawB: m.b,
    });
  }

  return { points, excluded };
}
