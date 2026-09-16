import { test, expect } from '@playwright/test';

// T439 — E2E cross-user de favoritos contra PRODUÇÃO (E2E_PROD=1).
// Cria 2 contas de teste (padrão t439.test.*@example.com — limpeza via
// convenção docs/CLEANUP-TEST-ACCOUNTS.md). Read-only para outros usuários.

const API = process.env.E2E_API_URL ?? 'https://api.almanaquedosclubes.com/api/v1';
const RUN = Date.now();
const USER_A = {
  email: `t439.test.a${RUN}@example.com`,
  password: 'T439Fav!2026x',
  name: 'Teste A',
};
const USER_B = {
  email: `t439.test.b${RUN}@example.com`,
  password: 'T439Fav!2026x',
  name: 'Teste B',
};

async function registerAndLogin(
  request: import('@playwright/test').APIRequestContext,
  user: typeof USER_A,
): Promise<void> {
  const reg = await request.post(`${API}/auth/register`, {
    data: { ...user, acceptedTerms: true, acceptedPrivacy: true },
  });
  if (reg.status() !== 201 && reg.status() !== 200) {
    throw new Error(`register falhou: ${reg.status()} ${await reg.text()}`);
  }
  const login = await request.post(`${API}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(login.status()).toBe(200);
}

test.describe('T439 — favoritos cross-user (produção)', () => {
  let clubId = '';
  let clubName = '';

  test.beforeAll(async ({ request }) => {
    const res = await request.get(`${API}/clubs?limit=1`);
    const body = await res.json();
    clubId = body.data[0].id;
    clubName = body.data[0].name;
  });

  test('A favorita na página do clube → aparece em /favoritos sem reload (WS) → B não vê e não remove', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    // Contexto do usuário A
    const ctxA = await browser.newContext();
    const pageA0 = await ctxA.newPage();
    await registerAndLogin(pageA0.request, USER_A);

    // Painel aberto ANTES de favoritar (WS conectado, lista vazia)
    await pageA0.goto('/favoritos');
    await expect(pageA0.getByRole('heading', { name: /Meu Almanaque|My Almanaque|Mi Almanaque/ })).toBeVisible();
    await pageA0.evaluate(() => {
      (window as unknown as { __noReloadProof: boolean }).__noReloadProof = true;
    });

    // Segunda página do MESMO usuário: favorita o clube (botão coração otimista)
    const pageA1 = await ctxA.newPage();
    await pageA1.goto(`/clubs/${clubId}`);
    const heart = pageA1.getByRole('button', { name: /Favoritar|Favorite/i }).first();
    await expect(heart).toBeVisible({ timeout: 20000 });
    await heart.click();
    // O label muda ("Favoritar" → "Favorito") — asserção pelo estado pressionado.
    await expect(pageA1.getByRole('button', { pressed: true })).toBeVisible({ timeout: 15000 });

    // De volta ao painel (sem reload): o evento WS favorite_added atualiza a lista
    await pageA0.bringToFront();
    const clubLink = pageA0.locator(`a[href="/clubs/${clubId}"]`);
    await expect(clubLink).toBeVisible({ timeout: 20000 });
    const proof = await pageA0.evaluate(
      () => (window as unknown as { __noReloadProof?: boolean }).__noReloadProof,
    );
    expect(proof).toBe(true); // a página NÃO recarregou — chegou pelo WS

    // Usuário B: contexto separado; não vê favorito de A e não consegue removê-lo
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await registerAndLogin(pageB.request, USER_B);
    const bList = await pageB.request.get(`${API}/favorites`);
    const bBody = await bList.json();
    expect(bBody.data.some((f: { clubId: string }) => f.clubId === clubId)).toBe(false);

    const csrf = await (await pageB.request.get(`${API}/auth/csrf-token`)).json();
    const bRemove = await pageB.request.delete(`${API}/favorites/${clubId}`, {
      headers: { 'x-csrf-token': csrf.data.csrfToken },
    });
    expect(bRemove.status()).toBe(200);
    expect((await bRemove.json()).removed).toBe(false); // B não tinha — e a de A permanece

    const aList = await pageA0.request.get(`${API}/favorites`);
    const aBody = await aList.json();
    expect(aBody.data.some((f: { clubId: string }) => f.clubId === clubId)).toBe(true);

    await ctxA.close();
    await ctxB.close();
  });
});
