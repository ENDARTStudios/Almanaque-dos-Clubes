/**
 * T-ADMIN-W3 — DIAGNÓSTICO do admin: GET /api/v1/admin/diagnostics.
 *
 * Cobre o que a página consome e, principalmente, o que a entrega promete em
 * honestidade:
 *   - o trio de autorização (logado + papel admin + allowlist do operador);
 *   - `value` refletindo a MESMA expressão do código (inclusive o comparador
 *     divergente de BIRTHDAY_GIFT_ENABLED — "1" NÃO liga o handler);
 *   - flags de OUTRO processo voltando `value: null` + motivo (nunca valor inventado);
 *   - não existe rota de ESCRITA de flag (o "toggle" não pode existir);
 *   - nenhum segredo no corpo.
 *
 * Espelha `admin-metrics.test.ts` (mesma construção de token e de cookie — o
 * `authenticate` lê `access_token` do COOKIE httpOnly, não do header Bearer).
 * O payload NÃO consulta o banco: por isso a suíte não exige Postgres.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

// Teto por teste: cada requisição AUTENTICADA custa ~12 s quando o Redis do ambiente
// não responde (o access-blocklist de `authenticate` retenta e faz fail-open) e várias
// asserções chamam o endpoint mais de uma vez. O default do vitest é 5 s.
vi.setConfig({ testTimeout: 120_000 });

let app: FastifyInstance;

const OPERADOR = process.env.OPERATOR_EMAILS?.split(',')[0]?.trim() ?? 'endart.studios@gmail.com';
const INTRUSO_ADMIN = 'admin-qualquer@exemplo.com';
const URL = '/api/v1/admin/diagnostics';

interface FlagView {
  key: string;
  owner: string;
  kind: string;
  scope: string;
  effectOn: string;
  effectOff: string;
  defaultOn: boolean;
  change: string;
  source: string;
  drift: string | null;
  value: boolean | null;
  raw: string | null;
  unavailableReason: string | null;
}

interface Payload {
  generatedAt: string;
  processes: {
    api: {
      service: string;
      nodeEnv: string;
      commit: string | null;
      uptimeSeconds: number;
      startedAt: string;
      schedulerEnabled: boolean;
      redisConfigured: boolean;
    };
  };
  flags: FlagView[];
  featureFlagPackage: {
    hasPersistedOverride: boolean;
    consumedByRuntime: boolean;
    flags: Array<{ key: string; minimumPlan: string }>;
  };
  schedulers: { error: string | null; items: Array<Record<string, unknown>> };
  upload: { maxBytes: number; allowedMimes: string[]; listingEndpoint: null };
  notes: string[];
}

function tokenDe(email: string, roles: string[]): string {
  return app.jwt.sign({ sub: `user-${email}`, email, roles, permissions: [], type: 'access' });
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

async function operatorGet(): Promise<Payload> {
  const res = await app.inject({
    method: 'GET',
    url: URL,
    headers: auth(tokenDe(OPERADOR, ['admin'])),
  });
  expect(res.statusCode).toBe(200);
  return (res.json() as { data: Payload }).data;
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app?.close();
});

describe('GET /admin/diagnostics — autorização em camadas', () => {
  it('(a) sem token é 401', async () => {
    const res = await app.inject({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(401);
  });

  it('(b) usuário comum (sem papel admin) é 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: auth(tokenDe('comum@exemplo.com', [])),
    });
    expect(res.statusCode).toBe(403);
  });

  it('(c) admin que NÃO é o operador é 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: auth(tokenDe(INTRUSO_ADMIN, ['admin'])),
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('FORBIDDEN');
  });

  it('(d) NÃO existe rota de escrita de flag (o "toggle" não pode existir)', async () => {
    const antes = await operatorGet();
    const antesValor = antes.flags.find((f) => f.key === 'PAYMENTS_ENABLED')?.value;
    for (const method of ['POST', 'PUT', 'PATCH'] as const) {
      const res = await app.inject({
        method,
        url: URL,
        headers: auth(tokenDe(OPERADOR, ['admin'])),
        payload: { key: 'PAYMENTS_ENABLED', value: true },
      });
      // A escrita NUNCA chega a um handler: ou o gate de CSRF (403) ou o roteador
      // (404/405) encerra antes. Nenhum 2xx, e nada muda no inventário.
      expect(res.statusCode, `${method} não deveria ter handler`).toBeGreaterThanOrEqual(403);
      expect(res.statusCode).toBeLessThan(500);
    }
    const depois = await operatorGet();
    expect(depois.flags.find((f) => f.key === 'PAYMENTS_ENABLED')?.value).toBe(antesValor);
  });
});

describe('GET /admin/diagnostics — inventário de flags', () => {
  it('lista as flags do projeto, cada uma com efeito, origem e forma de mudar', async () => {
    const data = await operatorGet();
    const keys = data.flags.map((f) => f.key);
    for (const expected of [
      'PAYMENTS_ENABLED',
      'BIRTHDAY_GIFT_ENABLED',
      'ETL_SCHEDULER_ENABLED',
      'WIKIDATA_DRY_RUN',
      'MEDIA_WORKER_LOCAL',
      'RANKING_CRON_AUTO',
      'ORCHESTRATION_ENABLED',
      'USER_TRACKING_ENABLED',
      'RATE_LIMIT_DISABLED',
      'GOOGLE_LOGIN_ENABLED',
      'LEGAL_PAGES_ENABLED',
      'COOKIE_BANNER_ENABLED',
      'MEDIA_WORKER_ONCE',
    ]) {
      expect(keys, `flag ausente: ${expected}`).toContain(expected);
    }
    expect(new Set(keys).size).toBe(keys.length); // sem duplicata
    for (const f of data.flags) {
      expect(f.key.length).toBeGreaterThan(0);
      expect(['api', 'web', 'worker']).toContain(f.owner);
      expect(['env', 'derived']).toContain(f.kind);
      expect(f.scope.length).toBeGreaterThan(0);
      expect(f.effectOn.length).toBeGreaterThan(10);
      expect(f.effectOff.length).toBeGreaterThan(10);
      expect(f.source).toMatch(/^apps\//);
      expect(f.change.length).toBeGreaterThan(20);
      // Ou tem valor, ou declara por que não tem — nunca os dois em branco.
      const hasValue = typeof f.value === 'boolean';
      expect(hasValue || (f.unavailableReason ?? '').length > 10).toBe(true);
    }
  });

  it('o valor relatado é o da MESMA expressão do código (inclusive os contra-intuitivos)', async () => {
    // Duas leituras (e não seis) de propósito: sem Redis no ambiente, cada requisição
    // AUTENTICADA gasta ~12 s (o access-blocklist de `authenticate` tenta o Redis e faz
    // fail-open) — o número de chamadas aqui é o CUSTO DO TESTE, não do endpoint.
    const antes = {
      payments: process.env.PAYMENTS_ENABLED,
      etl: process.env.ETL_SCHEDULER_ENABLED,
      gift: process.env.BIRTHDAY_GIFT_ENABLED,
    };
    // Restauração EXPLÍCITA por variável (sem `process.env[chave]` dinâmico).
    const restauraPayments = () => {
      if (antes.payments === undefined) delete process.env.PAYMENTS_ENABLED;
      else process.env.PAYMENTS_ENABLED = antes.payments;
    };
    const restauraEtl = () => {
      if (antes.etl === undefined) delete process.env.ETL_SCHEDULER_ENABLED;
      else process.env.ETL_SCHEDULER_ENABLED = antes.etl;
    };
    const restauraGift = () => {
      if (antes.gift === undefined) delete process.env.BIRTHDAY_GIFT_ENABLED;
      else process.env.BIRTHDAY_GIFT_ENABLED = antes.gift;
    };
    try {
      process.env.PAYMENTS_ENABLED = 'true';
      process.env.ETL_SCHEDULER_ENABLED = '1';
      process.env.BIRTHDAY_GIFT_ENABLED = 'true';
      const ligado = await operatorGet();
      const porChave = new Map(ligado.flags.map((f) => [f.key, f]));
      expect(porChave.get('PAYMENTS_ENABLED')?.value).toBe(true);
      expect(porChave.get('PAYMENTS_ENABLED')?.raw).toBe('true');
      expect(porChave.get('ETL_SCHEDULER_ENABLED')?.value).toBe(true);
      expect(porChave.get('BIRTHDAY_GIFT_ENABLED')?.value).toBe(true);
      expect(porChave.get('PAYMENTS_ENABLED')?.kind).toBe('env');
      expect(porChave.get('GOOGLE_LOGIN_ENABLED')?.kind).toBe('derived');

      // Valores que PARECEM ligados e NÃO são: "1" para o pagamento (o comparador de
      // produção é `=== 'true'`), "true" para o scheduler de ETL (`=== '1'`) e "1" para
      // o presente de aniversário (o handler exige "true"). É isto que a página mostra
      // como valor EFETIVO + leitura divergente, em vez de um "ligado" genérico.
      process.env.PAYMENTS_ENABLED = '1';
      process.env.ETL_SCHEDULER_ENABLED = 'true';
      process.env.BIRTHDAY_GIFT_ENABLED = '1';
      const divergente = await operatorGet();
      const porChave2 = new Map(divergente.flags.map((f) => [f.key, f]));
      expect(porChave2.get('PAYMENTS_ENABLED')?.value).toBe(false);
      expect(porChave2.get('ETL_SCHEDULER_ENABLED')?.value).toBe(false);
      expect(porChave2.get('BIRTHDAY_GIFT_ENABLED')?.value).toBe(false);
      expect(porChave2.get('ETL_SCHEDULER_ENABLED')?.drift).toBeTruthy();
      expect(porChave2.get('BIRTHDAY_GIFT_ENABLED')?.drift).toBeTruthy();
      expect(porChave2.get('MEDIA_WORKER_LOCAL')?.drift).toBeTruthy(); // default invertido
    } finally {
      restauraPayments();
      restauraEtl();
      restauraGift();
    }
  });

  it('flag de OUTRO processo não inventa valor: value null + motivo', async () => {
    const data = await operatorGet();
    for (const key of ['LEGAL_PAGES_ENABLED', 'COOKIE_BANNER_ENABLED']) {
      const f = data.flags.find((fl) => fl.key === key);
      expect(f?.owner).toBe('web');
      expect(f?.value).toBeNull();
      expect(f?.unavailableReason).toBeTruthy();
    }
    const worker = data.flags.find((f) => f.key === 'MEDIA_WORKER_ONCE');
    expect(worker?.owner).toBe('worker');
    expect(worker?.value).toBeNull();
    expect(worker?.unavailableReason).toBeTruthy();
  });

  it('declara que NÃO há override persistido e que o pacote feature-flags é inerte', async () => {
    const data = await operatorGet();
    expect(data.featureFlagPackage.hasPersistedOverride).toBe(false);
    expect(data.featureFlagPackage.consumedByRuntime).toBe(false);
    expect(data.featureFlagPackage.flags.length).toBeGreaterThan(0);
    for (const f of data.flags) {
      // Toda entrada aponta mudança por variável no provedor + redeploy.
      expect(/redeploy|linha de comando/i.test(f.change)).toBe(true);
    }
  });

  it('não expõe segredo nem caminho de escrita de asset', async () => {
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    const body = res.body;
    expect(body).not.toContain(process.env.JWT_SECRET ?? '__sem_jwt_secret__');
    expect(body).not.toContain(process.env.JWT_REFRESH_SECRET ?? '__sem_refresh_secret__');
    expect(body).not.toContain('AccessKeyId');
    expect(body).not.toContain('SecretAccessKey');
    const data = (res.json() as { data: Payload }).data;
    // A listagem de assets não existe na API — a lacuna vem declarada, não resolvida por aqui.
    expect(data.upload.listingEndpoint).toBeNull();
  });
});

describe('GET /admin/diagnostics — saúde e upload', () => {
  it('traz processo da API, próxima execução dos jobs agendados e política de upload', async () => {
    const data = await operatorGet();
    expect(data.processes.api.service).toBe('api');
    expect(typeof data.processes.api.uptimeSeconds).toBe('number');
    expect(data.processes.api.uptimeSeconds).toBeGreaterThanOrEqual(0);

    // Redis pode estar ausente no ambiente de teste: ou vem a lista, ou vem o erro
    // REAL — nunca lista preenchida por estimativa.
    expect(Array.isArray(data.schedulers.items)).toBe(true);
    if (data.schedulers.error === null) {
      for (const s of data.schedulers.items) {
        expect(typeof s.queue).toBe('string');
        expect(typeof s.name).toBe('string');
        expect(s.nextRunAt === null || typeof s.nextRunAt === 'string').toBe(true);
      }
    } else {
      expect(data.schedulers.items).toHaveLength(0);
      expect(data.schedulers.error.length).toBeGreaterThan(0);
    }

    expect(data.upload.maxBytes).toBeGreaterThan(0);
    expect(data.upload.allowedMimes.length).toBeGreaterThan(0);
    expect(data.notes.length).toBeGreaterThan(0);
    // O payload é datado: nada de valor congelado em cache (o horário não é do boot).
    expect(new Date(data.generatedAt).getTime()).toBeGreaterThan(0);
    expect(new Date(data.processes.api.startedAt).getTime()).toBeLessThanOrEqual(
      new Date(data.generatedAt).getTime(),
    );
  });
});
