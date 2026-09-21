import { test, expect } from '@playwright/test';

// T441 — E2E do carrossel de campeões.
// Em produção o acervo não tem arestas WON → estado honesto de vazio.
// O fluxo COM cards é validado mockando a resposta da API (rota interceptada).

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
  data: [
    {
      hierarchy: 'mundial',
      champion: {
        club: { id: 'club-mundial-1111', name: 'Campeão Mundial FC', country: 'BR' },
        competition: { id: 'comp-1', name: 'FIFA Club World Cup' },
        season: 2023,
        trophy: null,
        gender: 'men',
        ranking: { name: 'Ranking 0-100 2023 — Masculino', position: 1, points: 100 },
        sourceUrl: 'https://www.wikidata.org/wiki/Q123456',
      },
    },
    {
      hierarchy: 'nacional',
      champion: {
        club: { id: 'club-nacional-2222', name: 'Campeão Nacional FC', country: 'BR' },
        competition: { id: 'comp-2', name: 'Campeonato Nacional' },
        season: 2023,
        trophy: null,
        gender: 'men',
        ranking: null,
        sourceUrl: null,
      },
    },
    { hierarchy: 'continental', champion: null, reason: 'sem dados auditáveis' },
    { hierarchy: 'estadual', champion: null, reason: 'sem dados auditáveis' },
    { hierarchy: 'municipal', champion: null, reason: 'sem dados auditáveis' },
  ],
  generatedAt: new Date().toISOString(),
};

test.describe('Carrossel de campeões (T441)', () => {
  // T448: com a ingestão de arestas WON, produção deixa de estar vazio — os
  // dois estados são honestos. O teste garante que a região responde SEM erro;
  // o estado vazio estrito fica no teste mockado abaixo.
  test('produção: região responde com estado vazio honesto OU cards reais', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    const region = page.getByRole('region', { name: /Campeões|Champions|Campeones/i });
    await expect(region).toBeVisible({ timeout: 20000 });
    const empty = page.getByTestId('champions-empty');
    const cards = page.locator('article');
    const ok = (await empty.isVisible().catch(() => false)) || (await cards.count()) > 0;
    expect(ok).toBe(true);
  });

  test('vazio mockado: sem campeões → estado vazio explícito', async ({ page }) => {
    await page.route('**/api/v1/champions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: FIXTURE.data.map((d) => ({ ...d, champion: null, reason: 'sem dados auditáveis' })),
          generatedAt: new Date().toISOString(),
        }),
      });
    });
    await dismissConsent(page);
    await page.goto('/');
    await expect(page.getByTestId('champions-empty')).toBeVisible({ timeout: 15000 });
  });

  test('com dados: cards renderizam, setas/teclado navegam, card linka para o clube', async ({
    page,
  }) => {
    await page.route('**/api/v1/champions*', async (route) => {
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

    // 2 cards (hierarquias com campeão); 3 vazias ficam de fora
    const cards = page.getByRole('link', { name: /Campeão (Mundial|Nacional) FC/i });
    await expect(cards).toHaveCount(2);

    // Link para o perfil do clube na temporada
    await expect(page.getByRole('link', { name: /Campeão Mundial FC/i })).toHaveAttribute(
      'href',
      '/clubs/club-mundial-1111?season=2023',
    );

    // T448 — fonte por aresta: card com sourceUrl mostra link "Fonte (Wikidata)";
    // card sem sourceUrl (nacional) não mostra.
    const fonte = page.getByTestId('champion-source-mundial');
    await expect(fonte).toBeVisible();
    await expect(fonte).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q123456');
    await expect(page.getByTestId('champion-source-nacional')).toHaveCount(0);

    // Navegação por teclado: foco no grupo, ArrowRight move para o card 2
    const group = page.getByRole('group', { name: /Campeões|Champions/i });
    await group.focus();
    await page.keyboard.press('ArrowRight');
    // Dots refletem a posição atual (2º dot selecionado)
    await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab').nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('mobile 375px: carrossel visível e rolável horizontalmente', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 720 } });
    const page = await ctx.newPage();
    await page.route('**/api/v1/champions*', async (route) => {
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
