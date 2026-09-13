#!/usr/bin/env node
/**
 * graft-dead — dead-code detection over graft's wiring graph.
 *
 * Inspired by codebase-memory-mcp's dead-code detection, adapted to the data
 * this repo already has: graft/.graph/wiring.json (tree-sitter symbols +
 * who-calls-what). Zero new dependencies, fully offline.
 *
 * Heuristic (honest, documented):
 *   DEAD    = unexported symbol with zero incoming calls/references/extends/implements
 *   SUSPECT = exported symbol with zero incoming IN-REPO edges (external
 *             consumers are invisible to the graph — human must judge)
 *   Excluded by convention (framework-invoked, invisible to static graph):
 *     - tests/specs (*.test.*, *.spec.*, tests/, e2e/)
 *     - Next.js App Router entries (page/layout/route/loading/error/...)
 *     - middleware.ts
 *
 * Usage:
 *   node scripts/graft/graft-dead.mjs [--graph <path>] [--json] [--limit N]
 *   [--include-tests] [--scope <prefix/>]   (e.g. --scope apps/api/)
 *
 * Exit code is always 0 (audit tool, not a gate).
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};
const flag = (name) => args.includes(name);

const GRAPH_PATH = resolve(opt('--graph', 'graft/.graph/wiring.json'));
const LIMIT = parseInt(opt('--limit', '30'), 10);
const SCOPE = opt('--scope', null); // e.g. "apps/api/"
const JSON_OUT = flag('--json');
const INCLUDE_TESTS = flag('--include-tests');

const LIVE_RELATIONS = new Set(['calls', 'references', 'extends', 'implements']);
const SYMBOL_KINDS = new Set(['function', 'method', 'class', 'interface', 'type']);
const TEST_RE = /(^|\/)(tests?|__tests__|e2e)\/|\.(test|spec)\.[cm]?[tj]sx?$/;
// Framework/tool-invoked entries, invisible to the static graph:
// - Next.js App Router + metadata files
// - *.config.* (next/vite/vitest/playwright/tailwind/postcss/eslint...)
// - *.d.ts ambient declarations (declare module blocks are never "called")
// - middleware.ts
const ENTRY_RE = /apps\/web\/src\/app\/(.*\/)?(page|layout|route|template|loading|error|not-found|default)\.[tj]sx?$|apps\/web\/src\/app\/(manifest|sitemap|robots)\.[tj]s$|apps\/web\/src\/app\/[^/]*\/(icon|apple-icon|opengraph-image|twitter-image)\.[tj]sx?$|\/(middleware)\.[tj]s$|\.config\.[cm]?[tj]s$|\.d\.[cm]?ts$/;

if (!existsSync(GRAPH_PATH)) {
  console.error(`graft-dead: graph not found at ${GRAPH_PATH} (run: graft build)`);
  process.exit(2);
}

const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8'));
const nodes = new Map(graph.nodes.map((n) => [n.id, n]));

// Warn if the graph is older than the newest source file it covers (stale read).
try {
  const graphMtime = statSync(GRAPH_PATH).mtimeMs;
  if (Date.now() - graphMtime > 7 * 24 * 3600 * 1000) {
    console.error('graft-dead: warning — wiring.json is older than 7 days, consider `graft build`.');
  }
} catch { /* best effort */ }

const incoming = new Map(); // target id -> count of live incoming edges

const sourceFiles = [...nodes.values()]
  .filter((n) => n.kind === 'file' && /\.[cm]?[tj]sx?$/.test(n.path))
  .map((n) => n.path);
const fileTexts = new Map();
function fileText(p) {
  if (!fileTexts.has(p)) {
    try { fileTexts.set(p, readFileSync(resolve(p), 'utf8')); }
    catch { fileTexts.set(p, null); }
  }
  return fileTexts.get(p);
}
for (const e of graph.edges) {
  if (!LIVE_RELATIONS.has(e.relation)) continue;
  if (e.source === e.target) continue; // self-recursion is not external usage
  incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
}

// Workspace bare-specifier imports (`@almanaque/domain`) are invisible to the
// static graph (proven: every packages/domain type shows zero incoming despite
// heavy use via `import { Club } from '@almanaque/domain'`). Resolve them
// textually: scope package.json name -> exported symbols used by name.
function bumpIncoming(id) {
  incoming.set(id, (incoming.get(id) || 0) + 1);
}
try {
  const scopePkg = new Map(); // '@almanaque/domain' -> 'packages/domain'
  for (const s of graph.meta.scopes || []) {
    try {
      const pkg = JSON.parse(readFileSync(resolve(s.prefix, 'package.json'), 'utf8'));
      if (pkg.name) scopePkg.set(pkg.name, s.prefix);
    } catch { /* scope without readable package.json */ }
  }
  const byScopeName = new Map(); // 'packages/domain' + '#' + 'Club' -> node id
  for (const n of nodes.values()) {
    if (n.exported && (n.kind === 'interface' || n.kind === 'type' || n.kind === 'class' ||
        n.kind === 'function' || n.kind === 'method' || n.kind === 'const')) {
      for (const [pkgName, prefix] of scopePkg) {
        if (n.path.startsWith(prefix)) byScopeName.set(prefix + '#' + n.name, n.id);
      }
    }
  }
  const importRe = /import\s+(?:type\s+)?(?:\{([^}]*)\}|([A-Za-z_$][\w$]*))\s+from\s+['"](@almanaque\/[^'"]+)['"]/g;
  for (const f of sourceFiles) {
    const text = fileText(f);
    if (!text) continue;
    let m;
    while ((m = importRe.exec(text))) {
      const [, named, def, pkg] = m;
      const prefix = scopePkg.get(pkg);
      if (!prefix) continue;
      const names = named ? named.split(',').map((s) => s.trim().split(/\s+as\s+/).pop()) : [];
      if (def) names.push(def);
      for (const name of names) {
        if (!name || name === 'type') continue;
        const id = byScopeName.get(prefix + '#' + name);
        if (id) bumpIncoming(id);
      }
    }
  }
} catch { /* workspace resolution is best-effort; graph edges remain authoritative */ }

// Files referenced from inside the repo (for the file-level section).
const importedFiles = new Set();
for (const e of graph.edges) {
  if (e.relation === 'imports' && nodes.has(e.target)) importedFiles.add(e.target);
}

const dead = [];
const suspect = [];
const sameFileRef = []; // zero graph edges BUT name reappears in its own file
const methodRef = []; // methods invoked as obj.name( somewhere — graph misses interface dispatch
const NO_VERIFY = flag('--no-verify');

// Cheap same-file verification: the static graph systematically misses
// same-file type annotations (ClubSeed, CompRow) and references-as-value
// (callbacks, default params like defaultFetcher). A bare-name reappearance
// in the defining file demotes DEAD -> SAME-FILE-REF (likely alive).
function countSameFileUses(entry) {
  try {
    const text = fileText(resolve(entry.path));
    if (!text) return 1; // unreadable file -> don't claim dead
    const lines = text.split('\n');
    const name = entry.id.split('#').pop();
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    let hits = 0;
    // Exact definition span only (no padding: adjacent-line usages like
    // `type B = Record<string, A>` right below `type A = ...` are real refs).
    const start = entry.span ? parseInt(entry.span.slice(1).split('-')[0]) : -1;
    const end = entry.span && entry.span.includes('-')
      ? parseInt(entry.span.split('-')[1].replace('L', ''))
      : start;
    lines.forEach((line, i) => {
      if (i + 1 >= start && i + 1 <= end) return; // own definition lines
      const m = line.match(re);
      if (m) hits += m.length;
    });
    return hits;
  } catch { return 1; } // unreadable file -> don't claim dead
}

// Object-method dispatch (repo.X(), service.Y()) through interfaces, and JSX
// usage (<HeroSection />), are invisible to the static graph (both proven on
// this repo). Fallback: a `.name(` or `<Name` occurrence anywhere in indexed
// sources demotes to METHOD-REF. Distinctive names only in practice.
function findMethodCalls(entry, kind) {
  const name = entry.id.split('#').pop().split('.').pop();
  if (!name || name.length < 3) return [];
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [];
  if (kind === 'method') patterns.push(`\\.${esc}\\s*\\(`);
  if (kind === 'function' && /^[A-Z]/.test(name)) patterns.push(`<${esc}(\\s|/?>)`);
  if (patterns.length === 0) return [];
  const re = new RegExp(`(?:${patterns.join('|')})`, 'g');
  const hits = [];
  for (const p of sourceFiles) {
    if (p === entry.path) continue; // same-file covered by SAME-FILE-REF tier
    const text = fileText(p);
    if (text && re.test(text)) {
      hits.push(p);
      if (hits.length >= 3) break;
    }
  }
  return hits;
}

// Main classification loop.
for (const n of nodes.values()) {
  if (!SYMBOL_KINDS.has(n.kind)) continue;
  if (SCOPE && !n.path.startsWith(SCOPE)) continue;
  if (!INCLUDE_TESTS && TEST_RE.test(n.path)) continue;
  if (ENTRY_RE.test(n.path)) continue;
  const hits = incoming.get(n.id) || 0;
  if (hits > 0) continue;
  const entry = { id: n.id, kind: n.kind, path: n.path, span: n.span, signature: n.signature };
  // Name-evidence applies to exported symbols too (a <HeroSection/> usage or
  // repo.create() call elsewhere is real liveness even when exported).
  if (!NO_VERIFY && (n.kind === 'method' || (n.kind === 'function' && /^[A-Z]/.test(n.name || '')))) {
    const refs = findMethodCalls(entry, n.kind);
    if (refs.length > 0) { entry.calledIn = refs; methodRef.push(entry); continue; }
  }
  if (n.exported) { suspect.push(entry); continue; }
  if (!NO_VERIFY && countSameFileUses(entry) > 0) { sameFileRef.push(entry); continue; }
  dead.push(entry);
}

// File-level: every contained symbol dead/suspect (none likely-alive via
// same-file refs) AND no in-repo imports.
const deadIds = new Set([...dead, ...suspect].map((d) => d.id));
const aliveIds = new Set([...sameFileRef, ...methodRef].map((d) => d.id));
const deadFiles = [];
for (const n of nodes.values()) {
  if (n.kind !== 'file') continue;
  if (!/\.[cm]?[tj]sx?$/.test(n.path)) continue;
  if (SCOPE && !n.path.startsWith(SCOPE)) continue;
  if (!INCLUDE_TESTS && TEST_RE.test(n.path)) continue;
  if (ENTRY_RE.test(n.path)) continue;
  if (importedFiles.has(n.id)) continue;
  const children = graph.edges
    .filter((e) => e.relation === 'contains' && e.source === n.id)
    .map((e) => e.target);
  if (children.length === 0) continue;
  if (children.some((id) => aliveIds.has(id))) continue;
  if (children.every((id) => deadIds.has(id))) {
    deadFiles.push({ path: n.path, span: n.span, symbols: children.length });
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ graph: GRAPH_PATH, dead, suspect, sameFileRef, methodRef, deadFiles }, null, 2));
  process.exit(0);
}

const fmt = (d) => `  ${d.kind.padEnd(9)} ${d.id}  (${d.path}:${d.span || '?'})`;
console.log(`graft-dead — graph: ${GRAPH_PATH} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
console.log(`\nDEAD (unexported, zero incoming, zero same-file refs — alta confiança): ${dead.length}`);
dead.slice(0, LIMIT).forEach((d) => console.log(fmt(d)));
if (dead.length > LIMIT) console.log(`  ... +${dead.length - LIMIT} more (use --limit N)`);
console.log(`\nSAME-FILE-REF (sem arestas no grafo, mas nome reaparece no próprio arquivo — provavelmente vivo via paths que o grafo não resolve: anotações de tipo locais, callbacks, default params): ${sameFileRef.length}`);
sameFileRef.slice(0, LIMIT).forEach((d) => console.log(fmt(d)));
if (sameFileRef.length > LIMIT) console.log(`  ... +${sameFileRef.length - LIMIT} more (use --limit N)`);
console.log(`\nMETHOD-REF (invocado como obj.nome() ou <Nome/> em outro arquivo — dispatch que o grafo não resolve; quase sempre vivo): ${methodRef.length}`);
methodRef.slice(0, LIMIT).forEach((d) => console.log(fmt(d) + `  <= ${d.calledIn.join(', ')}`));
if (methodRef.length > LIMIT) console.log(`  ... +${methodRef.length - LIMIT} more (use --limit N)`);
console.log(`\nSUSPECT (exported, zero incoming in-repo — julgar: consumidor externo?) ${suspect.length}`);
suspect.slice(0, LIMIT).forEach((d) => console.log(fmt(d)));
if (suspect.length > LIMIT) console.log(`  ... +${suspect.length - LIMIT} more (use --limit N)`);
console.log(`\nDEAD-FILES (todos os símbolos mortos + sem imports internos): ${deadFiles.length}`);
deadFiles.slice(0, LIMIT).forEach((f) => console.log(`  ${f.path}  (${f.symbols} symbols)`));
