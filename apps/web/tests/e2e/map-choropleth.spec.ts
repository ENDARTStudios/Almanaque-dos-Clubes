import { test, expect } from '@playwright/test';

// T467 — E2E do mapa-múndi choropleth. A API é MOCKADA (route interception);
// a agregação real é provada por apps/api/tests/integration/geo-stats.test.ts.
// Foco: navegação por TECLADO (fallback da lista de regiões) + SPA sem reload
// + aria/leitor de tela — o mapa NÃO é a única forma de navegar.

const GEO_STATS = {
  data: {
    generatedAt: '2026-09-22T00:00:00.000Z',
    source: 'derived',
    baseQuery: 'COUNT(clubs) GROUP BY country/state',
    totals: { clubsWithCountry: 3808, countries: 168, states: 97 },
    continents: [
      {
        code: 'EU',
        clubs: 1200,
        countries: [
          { id: 'c-se', iso2: 'SE', name: 'Sweden', clubs: 40, states: [{ id: 's-1', code: 'SE-M', name: 'Skåne', clubs: 3 }] },
        ],
      },
      {
        code: 'SA',
        clubs: 900,
        countries: [
          { id: 'c-br', iso2: 'BR', name: 'Brazil', clubs: 800, states: [{ id: 's-br', code: 'BR-RJ', name: 'Rio de Janeiro', clubs: 5 }] },
        ],
      },
    ],
  },
};

const CLUBS = {
  data: [{ id: 'club-1', name: 'Malmö FF', country: 'SE', city: 'Malmö', latitude: 55.5, longitude: 13 }],
  total: 1,
  limit: 24,
  offset: 0,
};

test.describe('Mapa-múndi (T467)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/clubs/geo-stats', (r) => r.fulfill({ json: GEO_STATS }));
    await page.route(/\/api\/v1\/clubs\?.*/, (r) => r.fulfill({ json: CLUBS }));
  });

  test('/map → 200, lista de regiões com contagem, mapa acessório', async ({ page }) => {
    const res = await page.goto('/map');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mapa-múndi');
    const regions = page.getByTestId('region-list');
    await expect(regions).toBeVisible();
    await expect(regions.getByRole('button', { name: /Europa,\s*1200 clubes/ })).toBeVisible();
    // mapa é DECORATIVO (aria-hidden); a navegação acessível é a lista de regiões
    await expect(page.locator('[aria-hidden="true"]').first()).toBeVisible();
    await expect(page.getByText(/Mundo\s*—\s*3808 clubes/)).toBeVisible();
  });

  test('teclado: foco na região → Enter desce de nível, aria-live anuncia (SPA, sem reload)', async ({
    page,
  }) => {
    await page.goto('/map');
    const europa = page.getByRole('button', { name: /Europa,\s*1200 clubes/ });
    await europa.focus();
    await europa.press('Enter');
    // desceu: agora lista países da Europa (Sweden)
    await expect(page.getByRole('button', { name: /Sweden,\s*40 clubes/ })).toBeVisible();
    // aria-live anuncia região + contagem
    await expect(page.getByText(/Europa\s*—\s*1200 clubes/)).toBeVisible();
    // desce para o país via teclado
    await page.getByRole('button', { name: /Sweden,\s*40 clubes/ }).press('Enter');
    await expect(page.getByRole('button', { name: /Skåne,\s*3 clubes/ })).toBeVisible();
    // lista de clubes atualiza sem reload (clube real mockado)
    await expect(page.getByRole('link', { name: 'Malmö FF' })).toBeVisible();
  });
});
