/**
 * T-24/28 — métricas Prometheus dos bots: contador de rodadas por status e
 * gauges por bot (idade da última rodada e falhas consecutivas).
 */
import { describe, expect, it } from 'vitest';
import {
  createMetricsRegistry,
  renderPrometheus,
} from '../../src/modules/observability/metrics.js';

describe('metrics de bots', () => {
  it('renderiza bots_runs_total como counter e os gauges como gauge', () => {
    const registry = createMetricsRegistry();
    registry.inc('bots_runs_total', { status: 'ok' });
    registry.inc('bots_runs_total', { status: 'failed' });
    registry.gauge('bots_last_run_age_seconds', { bot: 'players' }, 42);
    registry.gauge('bots_consecutive_failures', { bot: 'clubs' }, 3);

    const out = renderPrometheus(registry.all());
    expect(out).toContain('# TYPE bots_runs_total counter');
    expect(out).toContain('bots_runs_total{status="ok"} 1');
    expect(out).toContain('bots_runs_total{status="failed"} 1');
    expect(out).toContain('# TYPE bots_last_run_age_seconds gauge');
    expect(out).toContain('bots_last_run_age_seconds{bot="players"} 42');
    expect(out).toContain('# TYPE bots_consecutive_failures gauge');
    expect(out).toContain('bots_consecutive_failures{bot="clubs"} 3');
  });
});
