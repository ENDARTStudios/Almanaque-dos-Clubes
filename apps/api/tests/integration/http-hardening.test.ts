/**
 * T385 — hardening de superfície de requisição (itens 7.6/7.7) + guarda de
 * produção da flag RATE_LIMIT_DISABLED (gap registrado em T384).
 *
 * Usa o app real (buildApp) via inject, sem banco: as rotas exercitadas
 * (/health, 405/413) não tocam o Prisma; /upload é barrado na autenticação
 * antes de qualquer acesso a dados.
 *
 * - 7.6: TRACE/HEAD/CONNECT/PURGE (fora do conjunto usado) → 405 padronizado
 *   com header `Allow`; OPTIONS passa apenas como preflight CORS (204);
 *   métodos usados preservam o comportamento atual.
 * - 7.7: JSON acima de 1 MiB → 413 padronizado sem stack trace; rotas de
 *   upload aceitam acima de 1 MiB (override de 50 MiB por rota) e rejeitam
 *   acima de 50 MiB com o mesmo 413.
 * - Guarda: RATE_LIMIT_DISABLED=true com NODE_ENV=production falha o boot
 *   (função pura + processo filho real importando env.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import {
  ALLOW_HEADER,
  DEFAULT_BODY_LIMIT_BYTES,
  UPLOAD_BODY_LIMIT_BYTES,
  assertRateLimitGuard,
} from '../../src/config/http-hardening.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { PERMISSIONS } from '../../src/modules/auth/rbac.service.js';

const MiB = 1024 * 1024;

describe('T385 — superfície de métodos HTTP (7.6)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('preserva métodos usados: GET /health → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
  });

  it('rejeita TRACE com 405 padronizado e header Allow', async () => {
    const res = await app.inject({ method: 'TRACE', url: '/api/v1/health' });
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe(ALLOW_HEADER);
    const body = res.json();
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    expect(res.body).not.toContain('stack');
  });

  it.each([['HEAD'], ['CONNECT'], ['PURGE']])('rejeita %s com 405', async (method) => {
    const res = await app.inject({ method, url: '/api/v1/health' });
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe(ALLOW_HEADER);
  });

  it('aceita OPTIONS como preflight CORS (204 com Allow-Methods)', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/login',
      headers: {
        origin: 'https://almanaquedosclubes.com',
        'access-control-request-method': 'POST',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });

  it('rejeita OPTIONS sem preflight (sem Origin/ACRM) com 405', async () => {
    const res = await app.inject({ method: 'OPTIONS', url: '/api/v1/health' });
    expect(res.statusCode).toBe(405);
  });
});

describe('T385 — limites de payload (7.7)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejeita JSON acima de 1 MiB com 413 padronizado, sem stack trace', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: `{"email":"${'a'.repeat(DEFAULT_BODY_LIMIT_BYTES)}@x.com","password":"x"}`,
    });
    expect(res.statusCode).toBe(413);
    const body = res.json();
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body).not.toContain('stack');
    expect(res.body).not.toContain('FST_ERR');
  });

  it('mantém contrato para payload pequeno (validação, nunca 413)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    expect(res.statusCode).not.toBe(413);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rota de upload aceita payload acima de 1 MiB (override 50 MiB por rota)', async () => {
    const token = generateCsrfToken('t385-upload-2mib');
    const fileContent = 'a'.repeat(2 * MiB);
    const payload = [
      '--boundary385',
      'Content-Disposition: form-data; name="file"; filename="grande.txt"',
      'Content-Type: text/plain',
      '',
      fileContent,
      '--boundary385--',
      '',
    ].join('\r\n');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/upload',
      headers: {
        'content-type': 'multipart/form-data; boundary=boundary385',
        'x-csrf-token': token,
      },
      payload,
    });
    // Chega à autenticação (401), provando que o limite global de 1 MiB
    // não se aplica às rotas de upload.
    expect(res.statusCode).toBe(401);
    expect(res.statusCode).not.toBe(413);
  });

  it('rota de upload rejeita payload acima de 50 MiB com 413', async () => {
    // Autenticação real (JWT assinado pela própria instância) para alcançar o
    // handler, onde o corpo multipart é consumido e o limite é aplicado.
    // Multipart VÁLIDO com parte de arquivo > 50 MiB: o limite do plugin
    // (fileSize, 50 MiB via UPLOAD_MAX_BYTES) dispara 413 padronizado.
    const accessToken = app.jwt.sign({
      sub: 't385-user',
      email: 't385@test.local',
      roles: [],
      permissions: [PERMISSIONS.CLUBS_WRITE],
      type: 'access',
    });
    const token = generateCsrfToken('t385-upload-51mib');
    const fileContent = 'a'.repeat(UPLOAD_BODY_LIMIT_BYTES + 1024);
    const payload = [
      '--boundary385',
      'Content-Disposition: form-data; name="file"; filename="grande.txt"',
      'Content-Type: text/plain',
      '',
      fileContent,
      '--boundary385--',
      '',
    ].join('\r\n');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/upload',
      headers: {
        'content-type': 'multipart/form-data; boundary=boundary385',
        'x-csrf-token': token,
        cookie: `access_token=${accessToken}`,
      },
      payload,
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body).not.toContain('stack');
  });
});

describe('T385 — guarda de produção da flag RATE_LIMIT_DISABLED (gap T384)', () => {
  it('falha quando production + rateLimitDisabled', () => {
    expect(() => assertRateLimitGuard('production', true)).toThrow(/RATE_LIMIT_DISABLED/);
    expect(() => assertRateLimitGuard('production', true)).toThrow(/production/);
  });

  it('permite production sem a flag', () => {
    expect(() => assertRateLimitGuard('production', false)).not.toThrow();
  });

  it('permite a flag fora de produção (escape hatch de dev/teste)', () => {
    expect(() => assertRateLimitGuard('development', true)).not.toThrow();
    expect(() => assertRateLimitGuard('test', true)).not.toThrow();
  });

  it('boot real falha: env.ts em produção com a flag ligada encerra o processo', async () => {
    const probe = fileURLToPath(new URL('../fixtures/env-guard-probe.ts', import.meta.url));
    const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
      execFile(
        process.execPath,
        ['--import', 'tsx', probe],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_ENV: 'production',
            RATE_LIMIT_DISABLED: 'true',
            JWT_SECRET: 'p'.repeat(40),
            JWT_REFRESH_SECRET: 'r'.repeat(40),
            DATABASE_URL: 'file:./guard-probe.db',
          },
          timeout: 30_000,
        },
        (error, _stdout, stderr) => {
          const code = error && typeof error.code === 'number' ? error.code : null;
          resolve({ code, stderr: stderr ?? '' });
        },
      );
    });
    expect(result.code).not.toBeNull();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('RATE_LIMIT_DISABLED');
  });
});
