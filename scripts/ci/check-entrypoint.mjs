#!/usr/bin/env node
/**
 * T435-bloco-B — guarda contra regressão do incidente 2026-09-14
 * (entrypoint.sh referenciava `./node_modules/.bin/prisma`, inexistente na
 * imagem; container crashou em loop e derrubou a API de produção).
 *
 * Verifica, sem Docker e sem rede, que todo caminho relativo usado em
 * apps/api/entrypoint.sh existe na imagem descrita pelo Dockerfile raiz:
 *  - caminhos sob node_modules/ precisam constar na allowlist explícita
 *    (binários vindos de `pnpm install`, verificados na imagem viva);
 *  - demais caminhos precisam estar cobertos por uma linha COPY.
 *
 * Uso: node scripts/ci/check-entrypoint.mjs [--dockerfile path] [--entrypoint path]
 * Exit 1 (com motivo) em qualquer violação.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const DOCKERFILE = resolve(root, arg('--dockerfile', 'Dockerfile'));
const ENTRYPOINT = resolve(root, arg('--entrypoint', 'apps/api/entrypoint.sh'));

// Allowlist explícita: únicos caminhos gerados por `pnpm install` (não por
// COPY) que o entrypoint pode referenciar. Cada entrada foi verificada na
// imagem viva via `railway ssh` (ls); ampliar exige re-verificação.
const INSTALL_GENERATED_ALLOWLIST = new Set(
  ['./apps/api/node_modules/.bin/prisma'].map((p) =>
    p.replace(/^\.\//, '').replace(/\/$/, ''),
  ),
);

const failures = [];
if (!existsSync(DOCKERFILE)) failures.push(`Dockerfile não encontrado: ${DOCKERFILE}`);
if (!existsSync(ENTRYPOINT)) failures.push(`entrypoint não encontrado: ${ENTRYPOINT}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const dockerText = readFileSync(DOCKERFILE, 'utf8');
// Destinos COPY (2º operando), normalizados (sem ./ inicial nem trailing slash).
const norm = (p) => p.replace(/^\.\//, '').replace(/\/$/, '');
const copyDests = new Set();
for (const m of dockerText.matchAll(/^\s*COPY\s+(?:--from=\S+\s+)?(\S+)\s+(\S+)\s*$/gm)) {
  copyDests.add(norm(m[2]));
}

const entryText = readFileSync(ENTRYPOINT, 'utf8');
// Tokens de caminho relativo usados como comando ou argumento (--x= / resto).
const refs = new Set();
for (const m of entryText.matchAll(/(?:^|[\s"'])\.\/(?!node_modules\/\.bin\/)[\w./-]+/gm)) {
  refs.add(m[0].trim().replace(/^["']/, ''));
}
for (const m of entryText.matchAll(/--schema=(\S+)/g)) refs.add(m[1]);
for (const m of entryText.matchAll(/\.\/[\w./-]*node_modules\/[\w./-]+/g)) refs.add(m[0]);

let failed = false;
for (const ref of [...refs].sort()) {
  const clean = norm(ref.replace(/["';]+$/, ''));
  if (INSTALL_GENERATED_ALLOWLIST.has(clean)) continue;
  if (/node_modules\//.test(clean)) {
    console.error(`VIOLATION: ${clean} — caminho sob node_modules/ fora da allowlist explícita (ver INSTALL_GENERATED_ALLOWLIST).`);
    failed = true;
    continue;
  }
  const covered = [...copyDests].some(
    (d) => clean === d || clean.startsWith(d.endsWith('/') ? d : d + '/') || d === '.',
  );
  if (!covered) {
    console.error(`VIOLATION: ${clean} — sem cobertura por nenhum COPY do Dockerfile.`);
    failed = true;
  }
}

if (failed) {
  console.error('\ncheck-entrypoint: FAILED — entrypoint referencia paths fora da imagem.');
  process.exit(1);
}
console.log('check-entrypoint: OK — todas as referências do entrypoint existem na imagem.');
