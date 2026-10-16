import { test, expect } from '@playwright/test';

/**
 * T574 — A ÁREA DE ADMIN EM NAVEGADOR: o gate antes do título, sem chave crua, sem tela preta.
 *
 * POR QUE ESTE SPEC EXISTE
 *   Dois defeitos que o Operador encontrou em captura de tela viveram no único lugar que
 *   typecheck, lint, build e teste de unidade NÃO cobrem: o que o navegador DESENHA. Foram eles:
 *
 *     1. "pages.admin.title" aparecendo na tela — o `t()` devolveu a própria chave porque o
 *        caminho não existia. O typecheck valida o TIPO de `t()`, não a EXISTÊNCIA da chave.
 *     2. TELA PRETA em `/admin/observability` — `TypeError` de render derrubando a fronteira de
 *        erro. Nenhum portão olha a tela renderizada.
 *
 *   E um terceiro, que só apareceu quando eu finalmente medi: o `OperatorGate` estava DEPOIS do
 *   `<h1>` em quatro páginas, então quem não tinha permissão via o título da ferramenta e o pedido
 *   de login embaixo. O título anunciava uma ferramenta que a pessoa não podia abrir.
 *
 *   Aquele terceiro passou pela minha própria verificação porque eu só checava "existe h1" — não
 *   QUAL h1. A asserção que faltava é a que este arquivo tem.
 *
 * ESCOPO, DECLARADO
 *   Roda SEM sessão de operador, de propósito: o estado não-autenticado é o que o visitante e o
 *   atacante veem, e é onde os defeitos apareceram. O caminho autenticado (entrar e ver o painel)
 *   exige a senha do Operador e NÃO é coberto aqui.
 *
 *   Não roda no CI: nenhum workflow invoca o Playwright neste repo (fato já registrado noutros
 *   PRs). Para rodar: `pnpm --filter web exec playwright test tests/e2e/admin-area.spec.ts`.
 */

/** As dez rotas da área de admin. */
const ROTAS = [
  '/admin',
  '/admin/usuarios',
  '/admin/catalogo',
  '/admin/metricas',
  '/admin/auditoria',
  '/admin/lgpd',
  '/admin/diagnostics',
  '/admin/upload',
  '/admin/observability',
  '/admin/reports',
];

/** Qualquer coisa com cara de chave de i18n não resolvida. */
const CARA_DE_CHAVE = /\b(pages|components|nav|common)\.[a-zA-Z]+(\.[a-zA-Z]+)*\b/;

/**
 * O TÍTULO que TODA rota de admin mostra SEM sessão.
 *
 * É a tela de login, e isso é o ponto: uma ferramenta restrita não deve anunciar o próprio nome a
 * quem não pode abri-la. Se alguém mover o gate de volta para dentro do `<h1>`, o título da
 * ferramenta aparece no lugar e a asserção falha — que foi exatamente o defeito.
 *
 * O texto esperado é o `loginTitle` ('Entrar na administração'), e NÃO o `login` ('Entrar'). A
 * primeira versão deste spec esperava 'Entrar' e reprovou as dez rotas: eu escrevi a expectativa de
 * uma versão antiga do gate, em que o `<h1>` vinha do rótulo do BOTÃO.
 *
 * O spec estava errado e a tela estava certa. Fica registrado porque um teste que reprova o
 * comportamento correto é pior que teste nenhum: ele manda consertar o que não está quebrado.
 */
const TITULO_ESPERADO_SEM_SESSAO = 'Entrar na administração';

test.describe('T574 — área de admin, sem sessão', () => {
  for (const rota of ROTAS) {
    test(`${rota} mostra o login, e não a ferramenta`, async ({ page }) => {
      const erros: string[] = [];
      page.on('pageerror', (e) => erros.push(e.message));

      await page.goto(rota, { waitUntil: 'networkidle' });

      const texto = await page.evaluate(() => document.body.innerText);
      const h1 = (await page.locator('h1').first().innerText()).trim();

      // (1) Nenhuma chave crua. Este é o defeito do "pages.admin.title".
      expect(texto, 'chave de i18n não resolvida na tela').not.toMatch(CARA_DE_CHAVE);

      // (2) TÍTULO CORRETO — o gate antes do h1. É a asserção que faltava na minha verificação.
      expect(
        h1,
        `"${rota}" anuncia a ferramenta em vez de pedir login — o gate está DEPOIS do título`,
      ).toBe(TITULO_ESPERADO_SEM_SESSAO);

      // (3) A página renderizou conteúdo (não é a tela preta).
      expect(texto.trim().length).toBeGreaterThan(60);
      expect(texto, 'a fronteira de erro foi acionada').not.toMatch(
        /couldn't load|Application error/i,
      );

      // (4) Sem erro de runtime.
      expect(erros, `erros de runtime: ${erros.join(' | ')}`).toHaveLength(0);
    });
  }
});
