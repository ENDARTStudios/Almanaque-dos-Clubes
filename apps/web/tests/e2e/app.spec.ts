import { test, expect } from '@playwright/test';

test.describe('Almanaque dos Clubes — E2E', () => {
  test('home page carrega e mostra titulo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('História do Futebol');
  });

  test('navegacao para clubs funciona', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/clubs"]');
    await expect(page).toHaveURL(/\/clubs/);
    await expect(page.locator('h1')).toContainText('Clubes');
  });

  test('pagina de login tem formulario', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('button[type="submit"]')).toContainText('Entrar');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('pagina de registro tem formulario', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('h1')).toContainText('Criar Conta');
    await page.fill('input[type="email"]', 'new@example.com');
    await page.fill('input[type="password"]', 'Str0ng!Pass');
  });

  test('clubs detail retorna 404 para ID inexistente', async ({ page }) => {
    await page.goto('/clubs/00000000-0000-0000-0000-000000000000');
    await expect(page.locator('h1')).toContainText('não encontrada');
  });

  // T428/1.3 — métrica publicada = métrica auditável: o count do /map deve
  // refletir a API em runtime, nunca um valor assado no build (era "100" fixo).
  test('map mostra count real da API (T428 bug 1.3)', async ({ page }) => {
    const clubsWithCoords = Array.from({ length: 50 }, (_, i) => ({
      id: `map-e2e-${i}`,
      name: `Clube E2E ${i}`,
      country: 'BR',
      latitude: -10 - i * 0.1,
      longitude: -50 - i * 0.1,
    }));

    await page.route('**/api/v1/clubs?*', async (route) => {
      const url = new URL(route.request().url());
      const hasCoords = url.searchParams.get('hasCoordinates') === 'true';
      const payload = hasCoords
        ? { data: clubsWithCoords, total: 50, limit: 100, offset: 0 }
        : { data: [], total: 1889, limit: 1, offset: 0 };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await page.goto('/map');
    await expect(page.locator('h1')).toContainText('Mapa-múndi');
    const subtitle = page.locator('p', { hasText: 'clubes com coordenadas conhecidas' });
    // O texto deve vir da API mockada (50 de 1889), não de valor assado (100).
    await expect(subtitle).toContainText('50 de 1889 clubes com coordenadas conhecidas');
  });

  test('mapa: marcador leva ao perfil do clube (T435 FASE 4)', async ({ page }) => {
    const clubId = '11111111-1111-4111-8111-111111111111';
    await page.route('**/api/v1/clubs?*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('hasCoordinates') === 'true') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: clubId, name: 'Clube E2E', country: 'BR', latitude: -23.5, longitude: -46.6 },
            ],
            total: 1,
            limit: 100,
            offset: 0,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 1889, limit: 1, offset: 0 }),
      });
    });
    // Perfil: mock direto por id (evita depender de seed).
    await page.route(`**/api/v1/clubs/${clubId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: clubId,
            name: 'Clube E2E',
            country: 'BR',
            city: 'São Paulo',
            foundedYear: 1900,
            status: 'ACTIVE',
            sourceUrl: 'https://www.wikidata.org/wiki/Q1',
          },
        }),
      });
    });

    await page.goto('/map');
    await page.locator('.leaflet-marker-icon').first().click();
    const popupLink = page.locator('.leaflet-popup-content a');
    await expect(popupLink).toContainText('Ver perfil');
    await popupLink.click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${clubId}`));
    await expect(page.locator('h1')).toContainText('Clube E2E');
    await expect(page.locator('a[href="https://www.wikidata.org/wiki/Q1"]')).toBeVisible();
  });
});
