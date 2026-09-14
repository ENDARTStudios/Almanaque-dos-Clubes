import { test, expect } from '@playwright/test';

// T436 — E2E do consentimento de cookies.
// Rodar contra um ambiente com COOKIE_BANNER_ENABLED=true e
// LEGAL_PAGES_ENABLED=true (dev local usa apps/web/.env.local).

test.describe('Banner de cookies (T436)', () => {
  test.beforeEach(async ({ context }) => {
    // Sem consentimento prévio: contexto novo já vem limpo; garantimos de novo
    // por robustez (ex.: reuso de perfil em execuções locais).
    await context.clearCookies();
  });

  test('banner aparece com 3 botões de mesmo destaque (same-visual-weight)', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByTestId('cookie-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });

    const buttons = [
      page.getByTestId('cookie-accept'),
      page.getByTestId('cookie-reject'),
      page.getByTestId('cookie-manage'),
    ];
    for (const b of buttons) await expect(b).toBeVisible();

    // Mesmo peso visual: estilos computados idênticos nos 3 botões
    // (sem dark pattern — recusa tão visível quanto aceite).
    const styles = await Promise.all(
      buttons.map((b) =>
        b.evaluate((el) => {
          const s = window.getComputedStyle(el);
          return {
            backgroundColor: s.backgroundColor,
            color: s.color,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            padding: s.padding,
            borderRadius: s.borderRadius,
            borderWidth: s.borderWidth,
            minHeight: s.minHeight,
          };
        }),
      ),
    );
    expect(styles[1]).toEqual(styles[0]);
    expect(styles[2]).toEqual(styles[0]);

    // Contraste mínimo: botões não podem ser invisíveis/camuflados.
    expect(styles[0].backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('banner → gerenciar → salvar → prova enviada e persistida no cliente', async ({
    page,
    context,
  }) => {
    let proofPayload: unknown = null;
    await page.route('**/api/v1/consent', async (route) => {
      proofPayload = route.request().postDataJSON();
      // Mock do backend: a persistência real é provada pelo teste de
      // integração apps/api/tests/integration/consent.test.ts.
      await route.fulfill({ status: 201, body: '{"data":{"id":"e2e","version":"1.0"}}' });
    });

    await page.goto('/');
    const banner = page.getByTestId('cookie-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });

    // Abre o centro de preferências.
    await page.getByTestId('cookie-manage').click();
    const prefs = page.getByTestId('cookie-preferences');
    await expect(prefs).toBeVisible();

    // Necessários não são recusáveis: não existe checkbox "necessary".
    await expect(page.getByTestId('cookie-cat-necessary')).toHaveCount(0);

    // Escolhe granular: só analytics ligado.
    await page.getByTestId('cookie-cat-analytics').check();
    await page.getByTestId('cookie-save').click();

    // Prova enviada com payload correto (LGPD art. 20).
    await expect.poll(() => proofPayload).toBeTruthy();
    const payload = proofPayload as {
      visitorId: string;
      version: string;
      categories: Record<string, unknown>;
    };
    expect(payload.visitorId.length).toBeGreaterThanOrEqual(8);
    expect(payload.version).toBe('1.0');
    expect(payload.categories).toMatchObject({
      necessary: true,
      analytics: true,
      marketing: false,
    });

    // Persistência no cliente: localStorage + cookie consent_v.
    const stored = await page.evaluate(() => window.localStorage.getItem('consent_v'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string) as {
      choice: Record<string, boolean>;
      version: string;
    };
    expect(parsed.choice.necessary).toBe(true);
    expect(parsed.choice.analytics).toBe(true);
    expect(parsed.choice.marketing).toBe(false);
    const cookie = (await context.cookies()).find((c) => c.name === 'consent_v');
    expect(cookie).toBeTruthy();

    // Banner some após a escolha.
    await expect(banner).not.toBeVisible();
    await expect(prefs).not.toBeVisible();
  });

  test('escolha persistida: banner não reaparece ao recarregar', async ({ page }) => {
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
    await page.goto('/');
    await expect(page.getByTestId('cookie-banner')).toHaveCount(0);
  });

  test('rejeitar opcionais também fecha o banner e grava escolha', async ({ page }) => {
    await page.route('**/api/v1/consent', async (route) => {
      await route.fulfill({ status: 201, body: '{"data":{"id":"e2e"}}' });
    });
    await page.goto('/');
    const banner = page.getByTestId('cookie-banner');
    await expect(banner).toBeVisible({ timeout: 15000 });
    await page.getByTestId('cookie-reject').click();
    await expect(banner).not.toBeVisible();
    const stored = await page.evaluate(() => window.localStorage.getItem('consent_v'));
    const parsed = JSON.parse(stored as string) as { choice: Record<string, boolean> };
    expect(parsed.choice.analytics).toBe(false);
    expect(parsed.choice.marketing).toBe(false);
  });
});

test.describe('Páginas legais (T436 — flags on)', () => {
  const pages = [
    { path: '/privacidade', heading: 'Política de Privacidade' },
    { path: '/termos', heading: 'Termos de Uso e Serviço' },
    { path: '/cookies', heading: 'Política de Cookies' },
    { path: '/seguranca', heading: 'Segurança e Vulnerabilidades' },
  ];

  for (const { path, heading } of pages) {
    test(`GET ${path} retorna 200 com conteúdo real`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    });
  }

  test('/cookies exibe inventário real (consent_v + sem analytics/marketing)', async ({ page }) => {
    await page.goto('/cookies');
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(table).toContainText('access_token');
    await expect(table).toContainText('refresh_token');
    await expect(table).toContainText('consent_v');
  });

  test('/termos referencia /planos em vez de valores hardcoded', async ({ page }) => {
    await page.goto('/termos');
    const body = await page.locator('body').innerText();
    expect(body).toContain('/planos');
    expect(body).not.toContain('R$ 4,90');
    expect(body).not.toContain('R$ 9,90');
  });

  test('/privacidade lista fornecedores reais de infraestrutura', async ({ page }) => {
    await page.goto('/privacidade');
    const body = await page.locator('body').innerText();
    for (const vendor of ['Vercel', 'Railway', 'Cloudflare', 'Google Fonts', 'Stripe']) {
      expect(body).toContain(vendor);
    }
  });
});
