#!/usr/bin/env node
/**
 * Gera os SVGs avulsos de `apps/web/public/icons/` a partir da MESMA geometria que o
 * componente usa (`src/components/icons/icons.json`). Não há segunda cópia do desenho:
 * os arquivos são artefatos derivados, então não podem divergir do componente.
 *
 * Os SVGs são ARTE ORIGINAL do Almanaque dos Clubes (autoria END ART Studios) — ver
 * `docs/ICONES-AUTORAIS.md`. Não derivados de obra de terceiro.
 *
 * Uso (sem dependências, roda com o Node do sistema):
 *   node apps/web/scripts/export-icons.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', 'src', 'components', 'icons', 'icons.json');
const outDir = join(here, '..', 'public', 'icons');

/** Atributos numéricos camelCase → kebab-case do SVG. */
const ATTR_NAMES = {
  fillOpacity: 'fill-opacity',
  strokeWidth: 'stroke-width',
};

function attrsToSvg(shape) {
  return Object.entries(shape)
    .filter(([key]) => key !== 'tag')
    .map(([key, value]) => `${ATTR_NAMES[key] ?? key}="${value}"`)
    .join(' ');
}

function shapeToSvg(shape) {
  return `<${shape.tag} ${attrsToSvg(shape)} />`;
}

const { icons } = JSON.parse(readFileSync(source, 'utf8'));
mkdirSync(outDir, { recursive: true });

const names = Object.keys(icons);
for (const name of names) {
  const icon = icons[name];
  const body = icon.shapes.map((s) => `  ${shapeToSvg(s)}`).join('\n');
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!--`,
    `  ${name} — icone AUTORAL do Almanaque dos Clubes.`,
    `  Arte original do projeto (autoria END ART Studios). NAO derivado de fotografia,`,
    `  escudo, trofeu ou qualquer obra de terceiro: forma generica que evoca a categoria.`,
    `  Gerado por apps/web/scripts/export-icons.mjs a partir de`,
    `  apps/web/src/components/icons/icons.json — NAO edite este arquivo a mao.`,
    `-->`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="24" height="24"`,
    `  fill="none" stroke="currentColor" stroke-width="${icon.strokeWidth}"`,
    `  stroke-linecap="round" stroke-linejoin="round">`,
    body,
    `</svg>`,
    '',
  ].join('\n');
  writeFileSync(join(outDir, `${name}.svg`), svg, 'utf8');
}

console.log(`export-icons: ${names.length} SVGs escritos em ${outDir}`);
