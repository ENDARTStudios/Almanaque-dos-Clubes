/**
 * T422 — Testes de observabilidade (métricas, alertas, backup, rota Prometheus).
 * Sem rede/banco: registry em memória, verifyBackupGzip com buffer, e app.inject.
 */
import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import {
  createMetricsRegistry,
  renderPrometheus,
  formatLabels,
} from '../../src/modules/observability/metrics.js';
import { evaluateAlerts, renderAlertPayload } from '../../src/modules/observability/alerts.js';
import {
  verifyBackupGzip,
  uploadBackupToS3,
  type BucketClient,
} from '../../src/modules/observability/backup.js';
import { buildApp } from '../../src/app.js';

describe('metrics registry + Prometheus renderer', () => {
  it('inc acumula e renderiza no formato Prometheus', () => {
    const r = createMetricsRegistry();
    r.inc('http_requests_total', { method: 'GET', status: '200' });
    r.inc('http_requests_total', { method: 'GET', status: '200' });
    r.inc('http_5xx_total', {});
    const out = renderPrometheus(r.all());
    expect(out).toContain('http_requests_total{method="GET",status="200"} 2');
    expect(out).toContain('http_5xx_total 1');
    expect(out).toContain('# TYPE http_requests_total counter');
  });
  it('formatLabels ordena chaves', () => {
    expect(formatLabels({ b: '2', a: '1' })).toBe('{a="1",b="2"}');
  });
});

describe('alerts', () => {
  it('dispara 5xx>1%, auth>50/min, backup falhou, disco>80%', () => {
    const alerts = evaluateAlerts({
      httpRequests5xx: 20,
      httpRequestsTotal: 1000,
      authFailuresLastMinute: 60,
      backupLastOk: false,
      diskUsagePercent: 85,
    });
    const ids = alerts.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining(['http_5xx_rate', 'auth_failures', 'backup_failed', 'disk_usage']),
    );
  });
  it('nao dispara em cenario saudavel', () => {
    expect(
      evaluateAlerts({
        httpRequests5xx: 5,
        httpRequestsTotal: 1000,
        authFailuresLastMinute: 10,
        backupLastOk: true,
        diskUsagePercent: 50,
      }),
    ).toHaveLength(0);
  });
  it('renderAlertPayload gera JSON de webhook', () => {
    const p = JSON.parse(
      renderAlertPayload([{ id: 'http_5xx_rate', description: 'x', severity: 'critical' }]),
    ) as { source: string; alerts: { id: string }[] };
    expect(p.source).toBe('almanaque-dos-clubes');
    expect(p.alerts[0].id).toBe('http_5xx_rate');
  });
});

describe('backup verify + upload', () => {
  it('valida gzip JSON valido (tabelas/linhas)', () => {
    const buf = gzipSync(JSON.stringify({ clubs: [{ a: 1 }, { b: 2 }], matches: [{}] }));
    const res = verifyBackupGzip(buf);
    expect(res.ok).toBe(true);
    expect(res.tables).toBe(2);
    expect(res.totalRows).toBe(3);
  });
  it('falha em conteudo corrompido (nao fabrica ok)', () => {
    expect(verifyBackupGzip(Buffer.from('nao-gzip')).ok).toBe(false);
  });
  it('uploadBackupToS3 envia via cliente injetado e retorna a chave', async () => {
    let sent: { Bucket: string; Key: string; ContentType: string } | null = null;
    const fake: BucketClient = {
      send: async (input) => {
        sent = input;
        return {};
      },
    };
    const key = 'backups/almanaque-test.json.gz';
    const res = await uploadBackupToS3('package.json', key, fake, 'bucket-test');
    expect(res.key).toBe(key);
    expect(sent?.Key).toBe(key);
    expect(sent?.ContentType).toBe('application/gzip');
  });
});

describe('GET /api/v1/metrics (Prometheus)', () => {
  it('retorna 200 text/plain com formato Prometheus apos requisicao', async () => {
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/api/v1/health' }); // aquece o registry
    const res = await app.inject({ method: 'GET', url: '/api/v1/metrics' });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-type'])).toContain('text/plain');
    expect(res.body).toContain('# TYPE http_requests_total counter');
    expect(res.body).toContain('http_requests_total{method="GET",status="200"}');
    await app.close();
  });
});
