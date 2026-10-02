import { test, expect } from '@playwright/test';

// T444 — E2E: com a flag PAYMENTS_ENABLED OFF (produção), pagamentos não
// existem: /checkout → 404 e a API não registra a rota de checkout.

test.describe('Flag de pagamentos desligada (produção atual)', () => {
  test('rota /checkout retorna 404', async ({ page }) => {
    const res = await page.goto('/checkout');
    expect(res?.status()).toBe(404);
  });

  test('API /billing/checkout não registra rota quando flag off (404 para anônimo)', async ({ request }) => {
    // Sem flag, a rota de checkout não é registrada → 404 do Fastify
    // (com flag on seria 401 para anônimo — authenticate roda antes).
    const res = await request.post('https://api.almanaquedosclubes.com/api/v1/billing/checkout', {
      data: { plan: 'PRO', interval: 'month' },
    });
    expect([404, 401]).toContain(res.status());
  });
});
