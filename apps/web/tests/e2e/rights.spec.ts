import { test, expect } from '@playwright/test';

// T470 — E2E das páginas de direitos (deslogado). T467 atualizou este spec: o
// formulário público T445 foi substituído pelo processo autenticado + canal
// manual (sem SMTP). O fluxo autenticado é provado por
// apps/api/tests/integration/legal.test.ts (RLS/owner) e pelo E2E de produção.
// Rodar com LEGAL_PAGES_ENABLED=true.

test.describe('Direitos do Titular (T470, deslogado)', () => {
  test('GET /direitos-titular → 200 com canal manual + DPO, sem formulário público', async ({
    page,
  }) => {
    const res = await page.goto('/direitos-titular');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Direitos do Titular');
    await expect(page.getByText(/endart\.studios@gmail\.com/).first()).toBeVisible();
    await expect(page.getByText(/Equipe END ART Studios/)).toBeVisible();
    // sem "resposta imediata conclusiva" e sem "DMCA"
    await expect(page.locator('body')).not.toContainText('resposta imediata');
    await expect(page.locator('body')).not.toContainText('DMCA');
  });
});

test.describe('Direitos Autorais (T470, deslogado)', () => {
  test('GET /direitos-autorais → 200, enquadramento Lei 9.610, sem safe harbor formal', async ({
    page,
  }) => {
    const res = await page.goto('/direitos-autorais');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Direitos Autorais');
    await expect(page.getByText(/Lei\s*9\.610\/98/).first()).toBeVisible();
    await expect(page.getByText(/não há agente DMCA registrado/i).first()).toBeVisible();
  });
});
