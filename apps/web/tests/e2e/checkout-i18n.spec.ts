import { test, expect } from '@playwright/test';

// T472a — E2E en/es da UI de assinatura (clareza CDC art. 6): /planos e /checkout
// em en/es sem PT vazado. NÃO exige pagamento (abre a UI; só o /checkout exige
// PAYMENTS_ENABLED=true, então é condicional).

test.describe('i18n da UI de assinatura (T472a)', () => {
  test('/planos em EN/ES: botões traduzidos, sem PT vazado', async ({ page }) => {
    await page.goto('/planos');

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('button', { name: /Subscribe Pro/ })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Assinar');

    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.getByRole('button', { name: /Suscribir Pro/ })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Assinar');

    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.getByRole('button', { name: /Assinar Pro/ })).toBeVisible();
  });

  test('/checkout em EN (condicional a PAYMENTS_ENABLED=true)', async ({ page }) => {
    const res = await page.goto('/checkout');
    test.skip(res?.status() === 404, 'PAYMENTS_ENABLED off — /checkout 404 (esperado)');
    await page.getByRole('button', { name: 'English' }).click().catch(() => {});
    // Sem PT vazado nos textos NOSSOS do resumo (preço/forma ficam no Stripe).
    await expect(page.locator('body')).not.toContainText('Antes de assinar');
    await expect(page.getByText(/Before subscribing/)).toBeVisible();
  });
});
