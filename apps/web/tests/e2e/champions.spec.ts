import { test, expect } from '@playwright/test';

// WS-C-2 — E2E do carrossel de campeões sobre o endpoint /champions/carousel.
// Em produção o acervo pode ter ou não scopes; o fluxo COM cards é validado mockando a rota.

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

const FIXTURE = {
  generatedAt: new Date().toISOString(),
  rulesVersion: 'ws-c-1-carousel-v1',
  scopes: [
    {
      hierarchy: 'mundial',
      season: 2023,
      gender: 'men',
      competition: { id: 'comp-1', qid: 'Q1', name: 'FIFA Club World Cup' },
      champion: { id: 'club-mundial-1111', qid: 'QC1', name: 'Campeão Mundial FC' },
      source: {
        type: 'wikidata',
        sourceUrl: 'https://www.wikidata.org/wiki/Q123456',
        authorCredit: null,
        license: 'CC0',
        retrievedAt: null,
      },
      confidence: 'single_active_record',
    },
    {
      hierarchy: 'nacional',
      season: 2023,
      gender: 'men',
      competition: { id: 'comp-2', qid: 'Q2', name: 'Campeonato Nacional' },
      champion: { id: 'club-nacional-2222', qid: 'QC2', name: 'Campeão Nacional FC' },
      source: {
        type: 'knowledge_graph',
        sourceUrl: null,
        authorCredit: null,
        license: null,
        retrievedAt: null,
      },
      confidence: 'single_active_record',
    },
  ],
  unavailable: [
    {
      hierarchy: 'continental',
      season: null,
      gender: null,
      competitionId: null,
      reason: 'no_active_provenanced_champion',
    },
    {
      hierarchy: 'estadual',
      season: null,
      gender: null,
      competitionId: null,
      reason: 'no_active_provenanced_champion',
    },
    {
      hierarchy: 'municipal',
      season: null,
      gender: null,
      competitionId: null,
      reason: 'no_active_provenanced_champion',
    },
  ],
  limitations: ['only_active_knowledge_graph_WON_edges'],
};

test.describe('Carrossel de campeões (WS-C-2)', () => {
  test('produção: região responde com estado vazio honesto OU cards reais', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    const region = page.getByRole('region', { name: /Campeões|Champions|Campeones/i });
    await expect(region).toBeVisible({ timeout: 20000 });
    const empty = page.getByTestId('champions-empty');
    const cards = page.getByTestId('champion-card');
    const ok = (await empty.isVisible().catch(() => false)) || (await cards.count()) > 0;
    expect(ok).toBe(true);
  });

  test('vazio mockado: sem scopes → estado vazio explícito', async ({ page }) => {
    await page.route('**/api/v1/champions/carousel*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...FIXTURE, scopes: [] }),
      });
    });
    await dismissConsent(page);
    await page.goto('/');
    await expect(page.getByTestId('champions-empty')).toBeVisible({ timeout: 15000 });
  });

  test('com dados: cards renderizam, teclado navega, card linka para o clube', async ({ page }) => {
    await page.route('**/api/v1/champions/carousel*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FIXTURE),
      });
    });
    await dismissConsent(page);
    await page.goto('/');
    const region = page.getByRole('region', { name: /Campeões|Champions|Campeones/i });
    await expect(region).toBeVisible({ timeout: 20000 });

    // 2 scopes → 2 cards; `unavailable` NÃO vira card.
    await expect(page.getByTestId('champion-card')).toHaveCount(2);

    await expect(page.getByRole('link', { name: /Campeão Mundial FC/i })).toHaveAttribute(
      'href',
      '/clubs/club-mundial-1111',
    );

    const fonte = page.getByTestId('champion-source-mundial');
    await expect(fonte).toBeVisible();
    await expect(fonte).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q123456');
    await expect(page.getByTestId('champion-source-nacional')).toHaveCount(0);

    const group = page.getByRole('group', { name: /Campeões|Champions/i });
    await group.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab').nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('mobile 375px: carrossel visível e rolável horizontalmente', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 720 } });
    const page = await ctx.newPage();
    await page.route('**/api/v1/champions/carousel*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FIXTURE),
      });
    });
    await dismissConsent(page);
    await page.goto('/');
    const region = page.getByRole('region', { name: /Campeões|Champions|Campeones/i });
    await expect(region).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('link', { name: /Campeão Mundial FC/i })).toBeVisible();
    await ctx.close();
  });
});
