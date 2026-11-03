/**
 * Screenshot de uma rota do app em execução.
 *
 * Uso: node shot.tmp.mjs <url> <arquivo.png> [largura] [altura]
 *
 * Existe porque "a tela está boa" não é verificável por typecheck, lint ou teste de unidade —
 * e eu tenho Chromium e olhos. O `waitUntil: 'networkidle'` importa: em `next dev` a primeira
 * requisição compila a rota, e um screenshot cedo pega a tela de carregamento.
 */
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const [, , url, saida, w = '1280', h = '900'] = process.argv;
if (!url || !saida) {
  console.error('uso: node shot.tmp.mjs <url> <arquivo.png> [w] [h]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
});

const erros = [];
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text());
});

// `networkidle` NUNCA assenta em `next dev` (o websocket do HMR mantém a conexão aberta).
// Esperar pelo seletor é o sinal certo: a página está pronta quando o conteúdo existe.
await page.goto(url, { waitUntil: 'load', timeout: 240_000 });
await page.waitForSelector('main h1, nav, .auth-card', { timeout: 240_000 });
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(saida), fullPage: true });
await browser.close();

console.log(`  screenshot: ${saida}`);
if (erros.length) {
  console.log(`  erros de console: ${erros.length}`);
  for (const e of erros.slice(0, 3)) console.log(`    ${e.slice(0, 160)}`);
}
