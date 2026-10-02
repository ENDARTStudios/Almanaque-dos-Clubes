#!/usr/bin/env node
/**
 * graft-impact — blast-radius of a change, from graft's wiring graph.
 *
 * Inspired by codebase-memory-mcp's git-diff impact mapping, adapted to the
 * data this repo already has: graft/.graph/wiring.json (calls edges) + git.
 * Zero new dependencies, fully offline.
 *
 * Maps changed files/lines -> symbols defined there -> transitive callers
 * (BFS over reversed `calls` + `references` edges). Answers "what breaks if
 * I touch this" BEFORE editing — the same question `graft callers --depth N`
 * answers one symbol at a time, here for a whole diff at once.
 *
 * Usage:
 *   node scripts/graft/graft-impact.mjs                 # uncommitted changes (worktree)
 *   node scripts/graft/graft-impact.mjs --staged        # staged changes only
 *   node scripts/graft/graft-impact.mjs --range HEAD~3..HEAD
 *   node scripts/graft/graft-impact.mjs --depth 3 --json
 *
 * Exit code is always 0 (audit tool, not a gate).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};
const GRAPH_PATH = resolve(opt('--graph', 'graft/.graph/wiring.json'));
const DEPTH = parseInt(opt('--depth', '2'), 10);
const JSON_OUT = args.includes('--json');

if (!existsSync(GRAPH_PATH)) {
  console.error(`graft-impact: graph not found at ${GRAPH_PATH} (run: graft build)`);
  process.exit(2);
}

// --- 1. Collect changed files + changed line ranges via git ---
function gitDiff(nameOnlyArgs) {
  try {
    return execFileSync('git', ['diff', '--no-color', '--unified=0', ...nameOnlyArgs], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (e) {
    return e.stdout || '';
  }
}

let rawDiff = '';
if (opt('--range', null)) {
  rawDiff = gitDiff([opt('--range', null)]);
} else if (args.includes('--staged')) {
  rawDiff = gitDiff(['--cached']);
} else {
  rawDiff = gitDiff([]);
  // Untracked files: whole file counts as added.
  try {
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const f of untracked) rawDiff += `\ndiff --git a/${f} b/${f}\n+++ b/${f}\n`;
  } catch { /* best effort */ }
}

// Parse unified diff with 0 context: file + added-line ranges.
const changed = new Map(); // path -> [{start, end}] | null (= whole file)
let cur = null;
for (const line of rawDiff.split('\n')) {
  let m;
  if ((m = line.match(/^\+\+\+ b\/(.+)$/))) {
    cur = m[1].trim();
    if (!changed.has(cur)) changed.set(cur, []);
  } else if (cur && (m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/))) {
    const start = parseInt(m[1]);
    const count = m[2] === undefined ? 1 : parseInt(m[2]);
    if (count > 0) changed.get(cur).push({ start, end: start + count - 1 });
    else changed.get(cur).push({ start, end: start }); // pure deletion touches the line
  } else if (line === 'Binary files differ' && cur) {
    changed.set(cur, null);
  }
}
// New-file diffs (--- /dev/null) have hunks covering everything already;
// files with zero hunks (mode-only changes) -> treat as whole file.
for (const [f, ranges] of changed) {
  if (ranges.length === 0) changed.set(f, null);
}

if (changed.size === 0) {
  console.log('graft-impact: no changes detected (clean tree).');
  process.exit(0);
}

// --- 2. Map changed ranges -> symbols ---
const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8'));
const nodes = new Map(graph.nodes.map((n) => [n.id, n]));

function spanStart(span) {
  if (!span) return 1;
  const m = span.match(/L(\d+)/);
  return m ? parseInt(m[1]) : 1;
}
function spanEnd(span) {
  if (!span) return Number.MAX_SAFE_INTEGER;
  const parts = span.match(/L(\d+)-L(\d+)/) || span.match(/L(\d+)/);
  if (!parts) return Number.MAX_SAFE_INTEGER;
  return parseInt(parts[2] || parts[1]);
}

const touched = new Map(); // symbol id -> {via} ('range' | 'file')
for (const n of nodes.values()) {
  if (n.kind === 'file') continue;
  const ranges = changed.get(n.path);
  if (ranges === undefined) continue;
  if (ranges === null) {
    touched.set(n.id, { via: 'file' });
    continue;
  }
  const s = spanStart(n.span);
  const e = spanEnd(n.span);
  if (ranges.some((r) => s <= r.end && e >= r.start)) touched.set(n.id, { via: 'range' });
}
// Changed files with no symbol overlap: the file node itself is the surface.
for (const [f, ranges] of changed) {
  if (ranges === null) {
    const fileNode = [...nodes.values()].find((n) => n.kind === 'file' && n.path === f);
    if (fileNode) touched.set(fileNode.id, { via: 'new-file' });
  }
}

// --- 3. BFS outward over reversed calls/references edges ---
const CALL_REL = new Set(['calls', 'references']);
const reverse = new Map(); // target -> [sources]
for (const e of graph.edges) {
  if (!CALL_REL.has(e.relation)) continue;
  if (e.source === e.target) continue;
  if (!reverse.has(e.target)) reverse.set(e.target, []);
  reverse.get(e.target).push(e.source);
}

const depthOf = new Map([...touched.keys()].map((id) => [id, 0]));
const queue = [...touched.keys()];
while (queue.length) {
  const cur = queue.shift();
  const d = depthOf.get(cur);
  if (d >= DEPTH) continue;
  for (const src of reverse.get(cur) || []) {
    if (!depthOf.has(src)) {
      depthOf.set(src, d + 1);
      queue.push(src);
    }
  }
}

// --- 4. Report ---
const byDepth = new Map();
for (const [id, d] of depthOf) {
  if (!byDepth.has(d)) byDepth.set(d, []);
  byDepth.get(d).push(id);
}

if (JSON_OUT) {
  const out = { graph: GRAPH_PATH, depth: DEPTH, changedFiles: [...changed.keys()], levels: {} };
  for (const [d, ids] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    out.levels[d] = ids.map((id) => {
      const n = nodes.get(id);
      return n ? { id, kind: n.kind, path: n.path, span: n.span } : { id };
    });
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

const label = (id) => {
  const n = nodes.get(id);
  if (!n) return `  [d?] ${id}  (unknown — possibly outside graph)`;
  return `  [d${depthOf.get(id)}] ${n.kind.padEnd(9)} ${id}`;
};
console.log(`graft-impact — ${changed.size} file(s) changed, depth ${DEPTH}, ${depthOf.size} symbol(s) in blast radius`);
console.log(`\nCHANGED SYMBOLS (depth 0): ${byDepth.get(0)?.length || 0}`);
(byDepth.get(0) || []).slice(0, 40).forEach((id) => console.log(label(id)));
for (let d = 1; d <= DEPTH; d++) {
  const ids = byDepth.get(d) || [];
  if (!ids.length) continue;
  // Group by file for readability.
  const byFile = new Map();
  for (const id of ids) {
    const n = nodes.get(id);
    const f = n ? n.path : '(outside graph)';
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(id);
  }
  console.log(`\nCALLERS at depth ${d}: ${ids.length} symbol(s) in ${byFile.size} file(s)`);
  for (const [f, fids] of [...byFile.entries()].sort()) {
    console.log(`  ${f} (${fids.length})`);
    fids.slice(0, 8).forEach((id) => console.log('   ' + label(id).trim()));
    if (fids.length > 8) console.log(`    ... +${fids.length - 8} more`);
  }
}
