// Mede o conceito renderizado: geometria real de cada texto e detecção de COLISÕES.
// Existe porque estimar altura de texto pelo `fontSize` não funciona — o FigCraft reporta a
// caixa real, e foi essa diferença que fez as duas linhas do H1 se sobreporem no primeiro
// render. Medir é mais barato que tentar de novo.
//
// O jeito confiável de escopar: `node.get` no FRAME devolve `children` com as coordenadas
// ABSOLUTAS de cada filho. Assim não há ambiguidade de id nem de sistema de coordenadas.
//
// Uso: node plugins/almanaque-design/tools/measure-concept.mjs <arquivo.figcraft> ["frame"]
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = 'C:/Program Files/FigCraft/figcraft-cli.exe';
const file = resolve(process.argv[2] ?? '.tmp/fig/concept.figcraft');
const wantFrame = process.argv[3];

const dir = mkdtempSync(join(tmpdir(), 'figmeasure-'));
const run = (steps) => {
  const p = join(dir, `s${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(p, JSON.stringify(steps));
  const raw = execFileSync(CLI, ['run', p], { encoding: 'utf8', maxBuffer: 300 * 1024 * 1024 });
  return raw
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

// 1) lista os frames do arquivo (ids sequenciais: varredura numa faixa generosa)
const probeIds = [];
for (let id = 1; id <= 400; id += 1) probeIds.push(id);
const dump = run([
  { command: 'file.open', params: { path: file } },
  ...probeIds.map((id) => ({ command: 'node.get', params: { id } })),
]);
const byId = new Map();
for (const r of dump) if (r.command === 'node.get' && r.ok && r.result?.id) byId.set(r.result.id, r.result);
const frames = [...byId.values()].filter((n) => n.type === 'FRAME' && !n.parent);
if (!frames.length) {
  console.error('nenhum frame de topo encontrado');
  process.exit(1);
}

// 2) escolhe o frame e lê os filhos com coordenadas absolutas
const frame = wantFrame ? frames.find((f) => f.name === wantFrame) : frames[0];
if (!frame) {
  console.error(`frame "${wantFrame}" não existe. Disponíveis: ${frames.map((f) => `"${f.name}"`).join(', ')}`);
  process.exit(1);
}
const full = run([
  { command: 'file.open', params: { path: file } },
  { command: 'node.get', params: { id: frame.id } },
]).find((r) => r.command === 'node.get' && r.ok)?.result;

const texts = (full?.children ?? [])
  .filter((c) => c.type === 'TEXT')
  .map((c) => ({ ...c, box: c.absoluteBounds ?? { x: c.x, y: c.y, width: c.width, height: c.height } }));

const inter = (a, b) => {
  const ox = Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);
  const oy = Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
  return ox > 1 && oy > 1 ? { ox: Math.round(ox), oy: Math.round(oy) } : null;
};
const collisions = [];
for (let i = 0; i < texts.length; i += 1) {
  for (let k = i + 1; k < texts.length; k += 1) {
    const hit = inter(texts[i], texts[k]);
    if (hit) {
      collisions.push({
        a: (texts[i].characters ?? '').slice(0, 32),
        b: (texts[k].characters ?? '').slice(0, 32),
        ov: `${hit.ox}×${hit.oy}px`,
        area: hit.ox * hit.oy,
      });
    }
  }
}
collisions.sort((a, b) => b.area - a.area);

const overflows = texts.filter((t) => t.box.y + t.box.height > frame.y + frame.height + 1 || t.box.x + t.box.width > frame.x + frame.width + 1);

console.log(`frame "${frame.name}" ${Math.round(frame.width)}×${Math.round(frame.height)} · textos: ${texts.length}`);
console.log(`COLISÕES: ${collisions.length}${collisions.length ? '' : '  (limpo)'}`);
for (const c of collisions.slice(0, 12)) console.log(`  ${c.ov.padStart(9)}  "${c.a}"  ×  "${c.b}"`);
console.log(`ESTOURA O FRAME: ${overflows.length}`);
for (const o of overflows.slice(0, 6)) console.log(`  "${(o.characters ?? '').slice(0, 34)}"  y+h=${Math.round(o.box.y + o.box.height)} x+w=${Math.round(o.box.x + o.box.width)}`);
console.log('\ngeometria vertical:');
for (const t of texts.sort((a, b) => a.box.y - b.box.y)) {
  console.log(
    `  y${String(Math.round(t.box.y)).padStart(4)} h${String(Math.round(t.box.height)).padStart(3)} → ${String(Math.round(t.box.y + t.box.height)).padStart(4)}  x${String(Math.round(t.box.x)).padStart(4)}  ${(t.characters ?? '').slice(0, 44)}`,
  );
}
