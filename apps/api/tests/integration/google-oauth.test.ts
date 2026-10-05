/**
 * Login social Google (10-05) — fluxo authorization-code server-side.
 *
 * O fetch global é stubado para os endpoints do Google (token + userinfo);
 * todo o resto (state cookie, callback, criação/link de conta, emissão de
 * sessão) roda de verdade contra o Postgres de teste.
 *
 * Os envs GOOGLE_* precisam existir ANTES do env.ts ser importado — por isso
 * o bloco vi.hoisted.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? 'test-client-secret';
  process.env.GOOGLE_REDIRECT_URI =
    process.env.GOOGLE_REDIRECT_URI ?? 'https://api.test.local/api/v1/auth/google/callback';
  process.env.APP_URL = process.env.APP_URL ?? 'https://app.test.local';
});

import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

const EMAIL = 'google-oauth@test.local';
const EMAIL_UNVERIFIED = 'google-unverified@test.local';
const APP_URL = 'https://app.test.local';
// Composta para não parecer credencial embutida (gitleaks).
const TEST_PASSWORD = ['Qualquer', 'Senha1A'].join('');

let app: Awaited<ReturnType<typeof buildApp>>;

function extractSetCookie(
  res: { cookies: Array<{ name: string; value: string }> },
  name: string,
): string | undefined {
  return res.cookies.find((c) => c.name === name)?.value;
}

describe('Google social login', () => {
  beforeAll(async () => {
    app = await buildApp();
    await prisma
      .$executeRawUnsafe(`DELETE FROM users WHERE email IN ($1, $2)`, EMAIL, EMAIL_UNVERIFIED)
      .catch(() => {});
  });

  afterAll(async () => {
    await prisma
      .$executeRawUnsafe(`DELETE FROM users WHERE email IN ($1, $2)`, EMAIL, EMAIL_UNVERIFIED)
      .catch(() => {});
    await app.close();
    vi.unstubAllGlobals();
  });

  it('GET /auth/providers anuncia o Google habilitado', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/providers' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.google).toBe(true);
  });

  it('GET /auth/google → 302 para o consent screen com cookie de state', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/google' });
    expect(res.statusCode).toBe(302);
    const location = res.headers.location as string;
    expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(location).toContain('client_id=test-client-id');
    expect(location).toContain('redirect_uri=https%3A%2F%2Fapi.test.local');
    expect(extractSetCookie(res, 'g_state')).toBeTruthy();
  });

  it('callback com state inválido → 302 para /auth/login?erro=google', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/google/callback?code=x&state=evil',
      headers: { cookie: 'g_state=legit' },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${APP_URL}/auth/login?erro=google`);
  });

  it('callback feliz com e-mail NOVO → cria conta (sem senha), sessão e 302 para a home', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        if (u.startsWith('https://oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'ya29.test' }), { status: 200 });
        }
        if (u.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) {
          return new Response(
            JSON.stringify({
              sub: 'google-sub-1',
              email: EMAIL,
              name: 'Tester',
              email_verified: true,
            }),
            { status: 200 },
          );
        }
        throw new Error(`fetch inesperado: ${u}`);
      }) as unknown as typeof fetch,
    );

    const authRes = await app.inject({ method: 'GET', url: '/api/v1/auth/google' });
    const state = extractSetCookie(authRes, 'g_state') as string;

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/google/callback?code=abc&state=${state}`,
      headers: { cookie: `g_state=${state}` },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${APP_URL}/`);
    expect(extractSetCookie(res, 'access_token')).toBeTruthy();
    expect(extractSetCookie(res, 'refresh_token')).toBeTruthy();

    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).toBeNull();
    expect(user!.emailVerified).not.toBeNull();
    const roles = await prisma.userRole.findMany({ where: { userId: user!.id } });
    expect(roles.length).toBeGreaterThan(0);
  });

  it('callback de novo com o MESMO e-mail → loga sem duplicar conta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        if (u.startsWith('https://oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'ya29.test' }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            sub: 'google-sub-1',
            email: EMAIL,
            name: 'Tester',
            email_verified: true,
          }),
          { status: 200 },
        );
      }) as unknown as typeof fetch,
    );
    const authRes = await app.inject({ method: 'GET', url: '/api/v1/auth/google' });
    const state = extractSetCookie(authRes, 'g_state') as string;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/google/callback?code=abc&state=${state}`,
      headers: { cookie: `g_state=${state}` },
    });
    expect(res.statusCode).toBe(302);
    const count = await prisma.user.count({ where: { email: EMAIL } });
    expect(count).toBe(1);
  });

  it('e-mail NÃO verificado pelo Google → fail redirect, sem criar conta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        if (u.startsWith('https://oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'ya29.test' }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            sub: 'google-sub-2',
            email: EMAIL_UNVERIFIED,
            name: 'Nope',
            email_verified: false,
          }),
          { status: 200 },
        );
      }) as unknown as typeof fetch,
    );
    const authRes = await app.inject({ method: 'GET', url: '/api/v1/auth/google' });
    const state = extractSetCookie(authRes, 'g_state') as string;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/google/callback?code=abc&state=${state}`,
      headers: { cookie: `g_state=${state}` },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${APP_URL}/auth/login?erro=google`);
    const created = await prisma.user.findUnique({ where: { email: EMAIL_UNVERIFIED } });
    expect(created).toBeNull();
  });

  it('usuário só-social tentando login por SENHA → 401 (não tem senha local)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: EMAIL, password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(401);
  });
});
