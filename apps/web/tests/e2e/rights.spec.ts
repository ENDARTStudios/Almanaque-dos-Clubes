import { test, expect } from '@playwright/test';

// T445 — E2E dos formulários de direitos do titular (LGPD art. 18) e
// copyright claims (DMCA). Rodar contra ambiente com LEGAL_PAGES_ENABLED=true
// (dev local: apps/web/.env.local).
//
// Padrão do consent.spec.ts: a API é MOCKADA aqui (route interception) — a
// persistência/validações de backend são provadas pelos testes de integração
// apps/api/tests/integration/privacy-copyright.test.ts.

test.describe('Direitos do Titular (T445)', () => {
  test('GET /direitos-titular → 200 com formulário e acompanhamento', async ({ page }) => {
    const res = await page.goto('/direitos-titular');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Direitos do Titular');
    await expect(page.getByLabel('Direito que deseja exercer')).toBeVisible();
    // 10 direitos do art. 18 no dropdown
    const options = await page
      .getByLabel('Direito que deseja exercer')
      .locator('option')
      .allTextContents();
    expect(options).toHaveLength(10);
    await expect(page.getByLabel('Seu e-mail de contato')).toBeVisible();
  });

  test('formulário → protocolo visível → acompanhar → status sem vazar email', async ({ page }) => {
    let createPayload: unknown = null;
    await page.route('**/api/v1/privacy-requests', async (route) => {
      if (route.request().method() === 'POST') {
        createPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          body: JSON.stringify({
            data: {
              id: 'e2e-id',
              token: 'e2e'.repeat(16),
              rightType: 'acesso',
              status: 'recebido',
              slaDueAt: new Date().toISOString(),
            },
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/direitos-titular');
    await page.getByLabel('Direito que deseja exercer').selectOption({ label: 'Acesso aos dados' });
    await page.getByLabel('Seu e-mail de contato').fill('titular.e2e@test.local');
    await page.getByRole('button', { name: 'Enviar solicitação' }).click();

    // Payload correto (rightType do enum da API + email).
    await expect.poll(() => createPayload).toBeTruthy();
    expect(createPayload).toMatchObject({ rightType: 'acesso', email: 'titular.e2e@test.local' });

    // Protocolo visível.
    await expect(page.getByRole('heading', { name: 'Solicitação registrada' })).toBeVisible();
    await expect(page.locator('code')).toContainText('e2e');

    // Acompanhar: GET mockado com status recebido.
    await page.route('**/api/v1/privacy-requests/e2e*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: {
            id: 'e2e-id',
            rightType: 'acesso',
            status: 'recebido',
            createdAt: new Date().toISOString(),
            slaDueAt: new Date().toISOString(),
            deferredUntil: null,
          },
        }),
      });
    });
    await page.getByRole('button', { name: 'Acompanhar agora' }).click();
    await expect(page.getByText('Recebida', { exact: true })).toBeVisible();
    // Projeção pública NÃO vaza email.
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('titular.e2e@test.local');
  });

  test('protocolo desconhecido → mensagem de não encontrado (sem expor dados)', async ({ page }) => {
    await page.route('**/api/v1/privacy-requests/zzz', async (route) => {
      await route.fulfill({
        status: 404,
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'não encontrada' } }),
      });
    });
    await page.goto('/direitos-titular');
    await page.getByLabel('Protocolo').fill('zzz');
    await page.getByRole('button', { name: 'Consultar' }).click();
    await expect(page.getByText('Protocolo não encontrado')).toBeVisible();
  });
});

test.describe('Copyright / DMCA (T445)', () => {
  test('GET /direitos-autorais → 200 com formulário e honeypot invisível', async ({ page }) => {
    const res = await page.goto('/direitos-autorais');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Direitos Autorais');
    await expect(page.getByLabel('Material alegadamente violado (descreva a obra)')).toBeVisible();
    // Honeypot existe no DOM mas é invisível para humanos.
    const honeypot = page.locator('#website');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).not.toBeVisible();
  });

  test('formulário DMCA → protocolo; honeypot segue no payload quando preenchido por bot', async ({
    page,
  }) => {
    const payloads: Array<Record<string, unknown>> = [];
    await page.route('**/api/v1/copyright-claims', async (route) => {
      payloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 201,
        body: JSON.stringify({ data: { id: 'dmca-e2e', status: 'recebida' } }),
      });
    });

    await page.goto('/direitos-autorais');
    await page
      .getByLabel('Material alegadamente violado (descreva a obra)')
      .fill('Fotografia registrada, autoria do notificante.');
    await page
      .getByLabel('Localização na plataforma (URL)')
      .fill('https://almanaquedosclubes.com/clubs/x/galeria/1');
    await page
      .getByLabel('Fundamentação legal e declaração de boa-fé')
      .fill('Uso sem licença — DMCA art. 512 e Lei 9.610/98, declaração de boa-fé.');
    await page.getByLabel('E-mail de contato').fill('autor.e2e@test.local');
    // Bot preenche o honeypot invisível (comportamento humano não preencheria).
    await page.evaluate(() => {
      const el = document.querySelector('#website') as HTMLInputElement | null;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      if (!el || !setter) throw new Error('honeypot ausente');
      setter.call(el, 'http://spam.example');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.getByRole('button', { name: 'Enviar notificação' }).click();

    await expect(page.getByRole('heading', { name: 'Notificação recebida' })).toBeVisible();
    await expect(page.locator('code')).toContainText('dmca-e2e');
    expect(payloads).toHaveLength(1);
    // O honeypot VIAJA (a decisão de descartar é do backend — ver integração).
    expect(payloads[0]?.website).toBe('http://spam.example');
  });
});

test.describe('Rodapé (T445)', () => {
  test('rodapé expõe os 2 canais novos', async ({ page }) => {
    await page.goto('/privacidade');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Direitos do Titular' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Direitos Autorais (DMCA)' })).toBeVisible();
  });
});
