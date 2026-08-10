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
});
