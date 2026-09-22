import { test, expect } from '@playwright/test';

// T465 — E2E de oferta honesta: /planos e /checkout descrevem o MESMO
// catálogo (fonte única plan-features.ts) e nada é cobrado como entregue
// sem estar no produto. Recurso não-operacional só aparece como "(em breve)".

test.describe('Oferta honesta (T465)', () => {
  test('/planos renderiza o comparativo (documentos por locale)', async ({ page }) => {
    await page.goto('/planos');
    await expect(page.getByRole('heading', { name: /Planos/i })).toBeVisible({ timeout: 20000 });
    // Texto soft com delegação ao checkout (a tabela concreta vive no checkout).
    await expect(page.getByText(/Comparativo completo dos planos|checkout/i).first()).toBeVisible();
  });

  test('/checkout exibe o catálogo da fonte única, sem promessa indefinida', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Recursos incluídos (por plano)')).toBeVisible({
      timeout: 20000,
    });

    // Pro e Elite presentes, alimentados por PLAN_FEATURES.
    for (const plan of ['Pro', 'Elite']) {
      await expect(page.getByText(plan, { exact: true }).first()).toBeVisible();
    }

    // Honestidade: não-operacional marcado; promessa indefinida removida.
    await expect(page.getByText('IA assistida com citações (em breve)')).toBeVisible();
    await expect(page.getByText('API de dados (em breve)')).toBeVisible();
    await expect(page.getByText('Busca avançada ilimitada')).toHaveCount(0);
    await expect(page.getByText('API com limites estendidos')).toHaveCount(0);

    // KG entregue (T448 destravou 5.157 arestas com fonte por aresta).
    await expect(page.getByText(/Grafo do conhecimento/)).toBeVisible();

    // Exportação honesta: formatos reais (CSV e JSON via GET /export).
    await expect(page.getByText('Exportações em CSV e JSON')).toBeVisible();
  });
});
