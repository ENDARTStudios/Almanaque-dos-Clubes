/**
 * T138 — cobertura das ROTAS de upload (routes 35% → alvo ≥80%).
 * http-hardening.test.ts já prova 401/413; aqui: NO_FILE (400), 403 sem
 * permissão, CSV inválido (422) e o caminho feliz com o cliente S3 MOCKADO
 * (nada de rede/MinIO).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const sendMock = vi.fn();
vi.mock('../../src/config/s3.js', () => ({
  s3Client: { send: (...args: unknown[]) => sendMock(...args) },
}));

import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
const suffix = Date.now();

function token(perms: string[]): Record<string, string> {
  const t = app.jwt.sign({
    sub: `t138-up-${suffix}`,
    email: `t138-up-${suffix}@test.local`,
    roles: [],
    permissions: perms,
    type: 'access',
  });
  return {
    Authorization: `Bearer ${t}`,
    cookie: `access_token=${t}`,
    'x-csrf-token': generateCsrfToken('t138-upload'),
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  sendMock.mockResolvedValue({});
});

afterAll(async () => {
  if (app) await app.close();
});

describe('rotas /upload (T138)', () => {
  it('POST /upload sem arquivo → 400 NO_FILE; sem permissão → 403', async () => {
    const noFile = await app.inject({
      method: 'POST',
      url: '/api/v1/upload',
      headers: {
        ...token(['clubs:write']),
        'content-type': 'multipart/form-data; boundary=boundaryt138',
      },
      payload: '--boundaryt138--\r\n',
    });
    expect(noFile.statusCode).toBe(400);
    expect(noFile.json().error.code).toBe('NO_FILE');

    const denied = await app.inject({
      method: 'POST',
      url: '/api/v1/upload',
      headers: {
        ...token(['players:read']),
        'content-type': 'multipart/form-data; boundary=boundaryt138',
      },
      payload: '--boundaryt138--\r\n',
    });
    expect(denied.statusCode).toBe(403);
  });

  it('POST /upload com PNG válido (magic bytes exatos via Buffer) → 201 (S3 mockado)', async () => {
    const boundary = 'boundaryt138';
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="escudo.png"\r\nContent-Type: image/png\r\n\r\n`,
      'binary',
    );
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'binary');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/upload',
      headers: {
        ...token(['clubs:write']),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.concat([head, pngBytes, tail]),
    });
    expect(res.statusCode, `BODY=${res.body.slice(0, 200)}`).toBe(201);
    expect(res.json().data.key.startsWith('uploads/')).toBe(true);
    expect(sendMock).toHaveBeenCalled();
  });

  it('POST /upload/csv: não-CSV → 422 INVALID_FORMAT; CSV válido → 201 em imports/', async () => {
    const wrong = await app.inject({
      method: 'POST',
      url: '/api/v1/upload/csv',
      headers: {
        ...token(['clubs:manage']),
        'content-type': 'multipart/form-data; boundary=boundaryt138',
      },
      payload: [
        '--boundaryt138',
        'Content-Disposition: form-data; name="file"; filename="dados.txt"',
        'Content-Type: text/plain',
        '',
        'não sou csv',
        '--boundaryt138--',
        '',
      ].join('\r\n'),
    });
    expect(wrong.statusCode).toBe(422);
    expect(wrong.json().error.code).toBe('INVALID_FORMAT');

    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/upload/csv',
      headers: {
        ...token(['clubs:manage']),
        'content-type': 'multipart/form-data; boundary=boundaryt138',
      },
      payload: [
        '--boundaryt138',
        'Content-Disposition: form-data; name="file"; filename="clubes.csv"',
        'Content-Type: text/csv',
        '',
        'name,country\nClube T138,BR',
        '--boundaryt138--',
        '',
      ].join('\r\n'),
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().data.key.startsWith('imports/')).toBe(true);
    expect(ok.json().data.mimeType).toBe('text/csv');
  });
});
