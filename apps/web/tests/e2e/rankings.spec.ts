import { test, expect } from '@playwright/test';

// T438 — E2E da página pública /rankings.
// Roda contra produção (possui rankings publicados de seed) ou ambiente com
// dados; read-only: nenhuma escrita é disparada.

test.describe('Página /rankings (T438)', () => {
  test.beforeEach(async ({ page }) => {
    // Dispensa o banner de consentimento sem escrever no backend.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'consent_v',
        JSON.stringify({
          choice: {
            necessary: true,
            preferences: false,
            analytics: false,
            personalization: false,
            marketing: false,
          },
          version: '1.0',
          ts: new Date().toISOString(),
        }),
      );
    });
  });

  test('tabela de rankings renderiza com entradas', async ({ page }) => {
    await page.goto('/rankings');
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 20000 });
    const rows = table.getByRole('row');
    // header + ao menos 1 entrada
    expect(await rows.count()).toBeGreaterThanOrEqual(2);
  });

  test('filtro por ano popula a partir dos rankings publicados e filtra', async ({ page }) => {
    await page.goto('/rankings');
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 20000 });

    const yearSelect = page.getByLabel(/Ano|Year|Año/);
    const options = await yearSelect.locator('option').allTextContents();
    const firstYear = options.find((o) => o && o !== '' && !/Todos|All/i.test(o));
    if (!firstYear) return; // sem temporadas publicadas — nada a filtrar
    await yearSelect.selectOption(firstYear);
    await expect(table).toBeVisible();
    expect(await table.getByRole('row').count()).toBeGreaterThanOrEqual(2);
  });

  test('click em clube navega para o perfil /clubs/[id]', async ({ page }) => {
    await page.goto('/rankings');
    const clubLink = page.locator('table a[href^="/clubs/"]').first();
    await expect(clubLink).toBeVisible({ timeout: 20000 });
    const href = await clubLink.getAttribute('href');
    expect(href).toMatch(/^\/clubs\//);
    await clubLink.click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace('/', '\\/')}$`));
  });
});
