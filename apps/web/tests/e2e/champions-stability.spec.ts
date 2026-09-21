import { test, expect } from '@playwright/test';

// T448c — E2E de estabilidade do carrossel de campeões.
//
// Critério de representação (vigência → edições → campeões distintos → nome →
// id) é determinístico: re-carregar a home NÃO pode mudar o campeão exibido.
// Rodar contra produção (E2E_BASE_URL=https://almanaquedosclubes.com) valida
// a vitrine real; sem campeões no acervo → skip honesto.

async function championNames(page: import('@playwright/test').Page): Promise<string[]> {
  await page.goto('/');
  const region = page.getByRole('region', { name: /Campeões|Champions|Campeones/i });
  await expect(region).toBeVisible({ timeout: 20000 });
  const empty = page.getByTestId('champions-empty');
  if (await empty.isVisible().catch(() => false)) return [];
  const cards = page.locator('article');
  const count = await cards.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push((await cards.nth(i).locator('p').first().textContent()) ?? '');
  }
  return names.sort();
}

test.describe('Carrossel de campeões — estabilidade (T448c)', () => {
  test('re-carregar a home não muda os campeões exibidos (sem dependência de ordem)', async ({
    page,
  }) => {
    const first = await championNames(page);
    test.skip(first.length === 0, 'acervo sem campeões — skip honesto');
    const second = await championNames(page);
    expect(second).toEqual(first);
  });
});
