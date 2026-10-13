#!/usr/bin/env node
/**
 * Portão anti-slop de movimento e UI — Almanaque dos Clubes.
 *
 * Implementa, por varredura de código, as regras que a skill `motion-craft` exige e que a
 * revisão manual esquece. Não substitui julgamento humano: pega o que é objetivamente
 * verificável (propriedade animada, curva, duração, gate de acessibilidade, import errado).
 *
 *   node plugins/almanaque-design/tools/audit-motion.mjs             # relatório legível
 *   node plugins/almanaque-design/tools/audit-motion.mjs --json      # saída para máquina
 *   node plugins/almanaque-design/tools/audit-motion.mjs --ci        # sai 1 se houver bloqueio
 *   node plugins/almanaque-design/tools/audit-motion.mjs --only=BLOCK
 *
 * Regras com severidade BLOCK (quebram a régua) e WARN (atenção). Código de saída:
 * 0 = sem bloqueio · 1 = há bloqueio (com --ci) · 2 = erro de uso.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..', '..', '..');

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const ciMode = argv.includes('--ci');
const only = argv.find((a) => a.startsWith('--only='))?.split('=')[1];

/** Raízes varridas: só o que é nosso e é UI.
 *  As próprias skills ficam FORA: elas citam os anti-padrões em prosa e em tabela de
 *  exemplo, e varrer isso produz falso positivo (o texto que ensina não é o defeito). */
const ROOTS = ['apps/web/src', 'apps/web/tests'];
const EXTS = new Set(['.ts', '.tsx', '.css', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '.turbo']);

/**
 * Cada regra: `re` é global e casa a linha; `severity` decide o veredito.
 * `hint` é a correção mínima, não um sermão.
 */
const RULES = [
  {
    id: 'transition-all',
    severity: 'BLOCK',
    re: /transition(?:-property)?\s*:\s*all\b|transition-all\b/g,
    title: '`transition: all` / `transition-all`',
    hint: 'Liste a propriedade exata: `transition: transform 200ms ease-out`. `all` anima o que ninguém pediu e tira da GPU.',
  },
  {
    id: 'scale-zero',
    severity: 'BLOCK',
    re: /scale\(\s*0\s*\)|scale-0\b/g,
    title: 'entrada a partir de `scale(0)`',
    hint: 'Comece em `scale(0.95)` + `opacity: 0`: nada no mundo real aparece do nada.',
  },
  {
    id: 'ease-in',
    severity: 'BLOCK',
    re: /ease-in\b(?!-out)|easing\s*:\s*['"]ease-in['"]|ease:\s*['"]easeIn['"]/g,
    title: '`ease-in` em animação de UI',
    hint: '`ease-in` atrasa o instante que o usuário mais observa. Use `ease-out` ou `cubic-bezier(0.23, 1, 0.32, 1)`.',
  },
  {
    id: 'framer-motion-import',
    severity: 'BLOCK',
    re: /from\s+['"]framer-motion['"]/g,
    title: 'import de `framer-motion`',
    hint: 'O pacote instalado é `motion@13`. Importe de `motion/react`.',
  },
  {
    id: 'layout-prop-animation',
    severity: 'BLOCK',
    re: /transition\s*:\s*(?:[^;{}]*?)\b(?:width|height|margin|padding|top|left|right|bottom)\b[^;{}]*?\b\d+m?s|transition-\[(?:width|height|margin|padding|top|left)\]/g,
    title: 'animação de propriedade de layout',
    hint: 'Troque por `transform`/`opacity`: `width/height` → `scale()`, `top/left/margin` → `translate()`. Layout dispara os três passos do pipeline.',
  },
  {
    id: 'will-change-broad',
    severity: 'WARN',
    re: /will-change\s*:\s*(?:all|\*)|will-change-transform\b(?![^]*?overflow)/g,
    title: '`will-change` amplo',
    hint: '`will-change` é o último passo, não o primeiro: só no elemento que anima, depois de ver o shift de 1 px ou frames perdidos medidos.',
  },
  {
    id: 'ungated-hover-motion',
    severity: 'WARN',
    re: /hover:scale-\d|hover:translate-[xy]-|hover:-translate-[xy]-/g,
    title: 'hover que move sem gate de ponteiro',
    hint: 'Envolva em `@media (hover: hover) and (pointer: fine)` ou use `motion-safe:hover:*`: em toque o hover dispara falso.',
  },
  {
    id: 'long-ui-duration',
    severity: 'WARN',
    re: /\b(?:duration|transition)[^;{}]*?\b([3-9]\d{2}|[1-9]\d{3})ms/g,
    title: 'duração de UI acima de 300 ms',
    hint: 'UI fica abaixo de 300 ms (feedback de pressão 100–160 ms; dropdown 150–250 ms). Exceção só para marketing/explicativo, com motivo escrito.',
  },
  {
    id: 'css-ease-string-in-gsap',
    severity: 'BLOCK',
    re: /(?:gsap\.[a-zA-Z]+\([^)]*|ease\s*:)\s*['"]cubic-bezier\(/g,
    title: 'string de `cubic-bezier()` passada ao GSAP',
    hint: "GSAP não interpreta sintaxe de CSS: `gsap.parseEase('cubic-bezier(…)')` devolve undefined e ele cai em `power1.out` — a curva forte vira fraca SEM erro. Em GSAP use `power4.out` (equivalente medido da curva 0.23,1,0.32,1).",
  },
  {
    id: 'low-alpha-text',
    severity: 'WARN',
    // Piso medido com o token ATUAL (`--color-foreground: #340808` sobre #fef2f2):
    // /50 = 3,32:1 · /55 = 4,19:1 · /60 = 4,72:1. Logo, abaixo de 60 reprova.
    re: /text-foreground\/(?:[1-5]\d)\b/g,
    title: 'texto com alfa abaixo do piso de contraste',
    hint: 'Com `--color-foreground: #340808` sobre #fef2f2: /60 = 4,72:1 (mínimo AA) · /50 = 3,32:1 · /40 = 2,50:1. Use `/60` como piso de texto e meça com `run.mjs contrast`. Abaixo de `/60`, só elemento decorativo.',
  },
  {
    id: 'gsap-ease-without-call-site-guard',
    severity: 'INFO',
    re: /gsap\.(?:fromTo|from|to)\s*\(/g,
    title: 'GSAP animando — confirme o gate de movimento no call site',
    hint: 'A regra de `prefers-reduced-motion` do `globals.css` NÃO alcança GSAP (ele escreve inline). O gate tem de estar em JS, no topo do hook: `matchMedia("(prefers-reduced-motion: reduce)")` → aplicar o estado final sem animar.',
  },
  {
    id: 'tailwind-opacity-in-scoped-theme',
    severity: 'WARN',
    re: /theme-dark[^"'`]*\b(?:bg|text|border)-(?:muted|background|foreground)\/\d+/g,
    title: 'modificador de opacidade dentro da camada escopada',
    hint: 'Na Tailwind v4.3.3 o utilitário com opacidade emite um literal do tema claro. Dentro de `.theme-dark` seja explícito: `bg-[color-mix(in_oklab,var(--color-foreground)_6%,transparent)]`.',
  },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (EXTS.has(extname(entry.name))) out.push(join(dir, entry.name));
  }
  return out;
}

/** Um achado é (arquivo, linha, coluna, regra). */
const findings = [];
const files = ROOTS.flatMap((root) => walk(join(repoRoot, root)));

if (files.length === 0) {
  console.error(`audit-motion: nenhum arquivo encontrado em ${ROOTS.join(', ')} (raiz: ${repoRoot})`);
  process.exit(2);
}

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const match of text.matchAll(rule.re)) {
      const index = match.index ?? 0;
      const line = text.slice(0, index).split('\n').length;
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        title: rule.title,
        hint: rule.hint,
        file: relative(repoRoot, file).split('\\').join('/'),
        line,
        excerpt: (lines[line - 1] ?? '').trim().slice(0, 120),
      });
    }
  }
}

const shown = only ? findings.filter((f) => f.severity === only.toUpperCase()) : findings;
const blocks = shown.filter((f) => f.severity === 'BLOCK');
const warns = shown.filter((f) => f.severity === 'WARN');
const infos = shown.filter((f) => f.severity === 'INFO');
const LABEL = { BLOCK: '✗ BLOQUEIA', WARN: '! ATENÇÃO ', INFO: 'i INFO    ' };

if (asJson) {
  console.log(
    JSON.stringify(
      {
        scanned: files.length,
        totals: { block: blocks.length, warn: warns.length, info: infos.length },
        findings: shown,
      },
      null,
      1,
    ),
  );
} else {
  const byRule = new Map();
  for (const f of shown) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }
  console.log(
    `auditoria de movimento e UI — ${files.length} arquivos varridos em ${ROOTS.length} raízes`,
  );
  console.log(
    `bloqueios: ${blocks.length} · atenção: ${warns.length} · informativo: ${infos.length}\n`,
  );
  if (byRule.size === 0) {
    console.log('nenhum achado. (Isso não é atestado de bom gosto: só as regras objetivas passaram.)');
  }
  // Bloqueio primeiro, depois atenção, informativo por último.
  const order = { BLOCK: 0, WARN: 1, INFO: 2 };
  const groups = [...byRule.values()].sort(
    (a, b) => order[a[0].severity] - order[b[0].severity] || b.length - a.length,
  );
  for (const list of groups) {
    const first = list[0];
    console.log(`${LABEL[first.severity]}  ${first.title}  (${list.length})`);
    console.log(`  ${first.hint}`);
    for (const f of list.slice(0, 12)) {
      console.log(`    ${f.file}:${f.line}  ${f.excerpt}`);
    }
    if (list.length > 12) console.log(`    … +${list.length - 12} ocorrência(s)`);
    console.log('');
  }
}

if (ciMode && blocks.length > 0) process.exit(1);
