import { test, expect } from '@playwright/test';

// T450 — indicador de sessão no navbar (AuthProvider como fonte única).
// API mockada aqui; persistência real é provada pela integração e pelo
// smoke manual (login → reload → sessão persiste).

const USER = {
  id: 'e2e-user',
  email: 'nav.e2e@test.local',
  name: 'Nav E2E',
  roles: ['free'],
};

function mockAuthMe(status: number, body?: unknown) {
  return async (route: import('@playwright/test').Route) => {
    if (route.request().url().includes('/auth/me')) {
      await route.fulfill({
        status,
        body: JSON.stringify(status === 200 ? { data: body } : body ?? {}),
      });
      return;
    }
    await route.fallback();
  };
}

test.describe('Navbar — indicador de sessão (T450)', () => {
  test('deslogado: navbar mostra "Entrar"', async ({ page }) => {
    await page.route('**/api/v1/auth/me', mockAuthMe(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }));
    await page.goto('/privacidade');
    await expect(page.getByTestId('nav-login')).toBeVisible();
    await expect(page.getByTestId('nav-user-menu')).toHaveCount(0);
  });

  test('logado: navbar mostra o usuário e o menu (Assinatura/Painel/Sair)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', mockAuthMe(200, USER));
    await page.goto('/privacidade');
    await expect(page.getByTestId('nav-user-menu')).toBeVisible();
    await expect(page.getByTestId('nav-user-name')).toContainText('Nav');
    await expect(page.getByTestId('nav-login')).toHaveCount(0);

    await page.getByTestId('nav-user-menu').click();
    const dropdown = page.getByTestId('nav-user-dropdown');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole('link', { name: 'Assinatura' })).toBeVisible();
    await expect(dropdown.getByRole('link', { name: 'Painel' })).toBeVisible();
    await expect(dropdown.getByTestId('nav-signout')).toBeVisible();
  });

  test('Sair → navbar volta a "Entrar"', async ({ page }) => {
    await page.route('**/api/v1/auth/me', mockAuthMe(200, USER));
    await page.route('**/api/v1/auth/logout', async (route) => {
      await route.fulfill({ status: 200, body: '{"data":{"ok":true}}' });
    });
    await page.goto('/privacidade');
    await page.getByTestId('nav-user-menu').click();
    await page.getByTestId('nav-signout').click();
    await expect(page.getByTestId('nav-login')).toBeVisible();
    await expect(page.getByTestId('nav-user-menu')).toHaveCount(0);
  });

  test('enquanto carrega: sem "Entrar" nem menu (placeholder)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.fulfill({ status: 200, body: JSON.stringify({ data: USER }) });
    });
    await page.goto('/privacidade');
    // Estado de carregamento não deve anunciar "Entrar" (evita flash de deslogado).
    const login = page.getByTestId('nav-login');
    await expect(page.getByTestId('nav-user-menu')).toBeVisible({ timeout: 10000 });
    expect(await login.count()).toBe(0);
  });
});
