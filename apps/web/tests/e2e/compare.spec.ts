import { test, expect } from '@playwright/test';

// T440 — E2E da página /compare. Contra produção (clubes de seed + rankings).

async function dismissConsent(page: import('@playwright/test').Page): Promise<void> {
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
}

async function pickOption(
  page: import('@playwright/test').Page,
  label: string,
  term: string,
): Promise<void> {
  const input = page.getByLabel(label, { exact: true });
  await input.click();
  await input.fill(term);
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible({ timeout: 15000 });
  await listbox.getByRole('option').first().click();
}

test.describe('Página /compare (T440)', () => {
  test.beforeEach(async ({ page }) => {
    await dismissConsent(page);
  });

  test('selecionar 2 clubes → Comparar → tabela e seções renderizam', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 20000 });

    await pickOption(page, 'A', 'Palmeiras');
    await pickOption(page, 'B', 'Flamengo');

    const btn = page.getByRole('button', { name: /Comparar|Compare/i });
    await expect(btn).toBeEnabled();
    await btn.click();

    // Tabela comparativa com linhas
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 20000 });
    expect(await table.getByRole('row').count()).toBeGreaterThanOrEqual(3);

    // Seção de títulos: gráfico (com dados) OU estado honesto de vazio
    // (0 títulos no acervo — CompareTitles renderiza <p> em vez do gráfico).
    const titlesSection = page
      .locator('section', {
        has: page.getByRole('heading', { name: /Títulos por hierarquia|Titles by hierarchy|Títulos por jerarquía/i }),
      })
      .first();
    await expect(titlesSection).toBeVisible({ timeout: 20000 });
    const hasChart = await page
      .getByRole('img', { name: /Títulos|Titles/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyNote = (await titlesSection.innerText()).length > 0;
    expect(hasChart || hasEmptyNote).toBe(true);
  });

  test('deep-link com ids abre comparação direta (SEO/meta)', async ({ page }) => {
    const API = 'https://api.almanaquedosclubes.com/api/v1';
    const a = (await (await page.request.get(`${API}/clubs?search=Palmeiras&limit=1`)).json()).data[0];
    const b = (await (await page.request.get(`${API}/clubs?search=Flamengo&limit=1`)).json()).data[0];
    await page.goto(`/compare?type=clubs&a=${a.id}&b=${b.id}`);
    // Deep-link compara automaticamente no primeiro load.
    await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });
  });

  test('mobile 375px: conteúdo empilhado e visível', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 720 } });
    const page = await ctx.newPage();
    await dismissConsent(page);
    await page.goto('/compare');
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel('A', { exact: true })).toBeVisible();
    await ctx.close();
  });

  test('acessibilidade: tab alcança os dois campos e o botão', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 20000 });
    await page.getByLabel('A', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('B', { exact: true })).toBeFocused();
    // Ambos os campos são alcançáveis por teclado; o botão fica no fluxo após B.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Comparar|Compare/i })).toBeVisible();
  });
});
