#!/usr/bin/env node
/**
 * Runner dos utilitários de QA visual do plugin `almanaque-design`.
 *
 *   node plugins/almanaque-design/tools/run.mjs <ferramenta> [args...]
 *
 * Ferramentas:
 *   shot     <url> <nome>        screenshots 1440/900, 390/844 e full page
 *   audit    <url>               overflow-x, alvos de toque, headings, console/HTTP
 *   contrast <url>               contraste WCAG do texto REALMENTE renderizado
 *   locales  <url>               renderiza pt-br/en-us/es-es e confere a copy
 *
 * Por que existe: `@playwright/test` resolve a partir de `apps/web/` e o `.tmp/shots`
 * a partir da raiz. O runner fixa o cwd em `apps/web` para os imports e resolve a
 * saída para `<repo>/.tmp/shots`, de modo que os utilitários rodam de qualquer lugar.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const webDir = resolve(repoRoot, 'apps', 'web');

const [, , tool, ...rest] = process.argv;
const available = ['shot', 'audit', 'contrast', 'locales'];

if (!tool || tool === '--help' || tool === '-h') {
  console.log(`uso: node plugins/almanaque-design/tools/run.mjs <${available.join('|')}> [args...]`);
  process.exit(tool ? 0 : 1);
}
if (!available.includes(tool)) {
  console.error(`ferramenta desconhecida: ${tool} (disponíveis: ${available.join(', ')})`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [resolve(here, `${tool}.mjs`), ...rest],
  { cwd: webDir, stdio: 'inherit', env: { ...process.env, QA_REPO_ROOT: repoRoot } },
);
process.exit(result.status ?? 1);
