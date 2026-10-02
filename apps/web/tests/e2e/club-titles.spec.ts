import { test, expect } from '@playwright/test';

// T448 — E2E da galeria de honra no perfil do clube (arestas WON reais).
//
// A página do clube é Server Component: o fetch acontece server-side e NÃO é
// interceptável com page.route. Este spec exige stack LOCAL completa com o
// corpus do T448 aplicado (API em :3000 com Postgres+Redis ou fallback, web
// dev em :3001). Sem stack/dado → skip honesto (nunca falso-verde).

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

test.describe('Galeria de honra do clube (T448)', () => {
  test('clube com conquistas auditáveis mostra títulos com ano e fonte', async ({ page }) => {
    // Descobre um clube com título direto na API local (dado real do corpus).
    const apiUrl = process.env.T448_API_URL || 'http://localhost:3000/api/v1';
    let clubId = '';
    try {
      const res = await fetch(`${apiUrl}/clubs?limit=100`);
      const json = await res.json();
      for (const club of json.data as Array<{ id: string }>) {
        const t = await fetch(`${apiUrl}/clubs/${club.id}/titles`);
        const tj = await t.json();
        if (tj.total > 0) {
          clubId = club.id;
          break;
        }
      }
    } catch {
      test.skip(true, 'stack local sem API — skip honesto');
    }
    test.skip(!clubId, 'nenhum clube com título no corpus local — skip honesto');

    await dismissConsent(page);
    await page.goto(`/clubs/${clubId}`);
    const gallery = page.getByTestId('club-honour-gallery');
    await expect(gallery).toBeVisible({ timeout: 15000 });

    // Pelo menos um título com ano e link de fonte por aresta.
    const titles = page.getByTestId('club-honour-title');
    await expect(titles.first()).toBeVisible();
    const fonte = gallery.locator('a[href*="wikidata.org"]').first();
    await expect(fonte).toBeVisible();
  });
});
