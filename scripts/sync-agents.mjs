#!/usr/bin/env node
/**
 * SINCRONIZA AS SKILLS/AGENTES DOS PLUGINS PARA OS ESCOPOS LOCAIS.
 *
 * Porte em Node do `plugins/scripts/sync-to-workspace.sh`. O motivo do porte é concreto, não
 * preferência: **não existe `bash` no PATH desta máquina Windows** (o comando roteia para a WSL,
 * que responde `execvpe(/bin/bash) failed: No such file or directory`). A documentação do projeto
 * manda rodar o `.sh` — e ele não roda aqui. Como consequência, as cópias em `.dsh/` e `.zcode/`
 * ficaram para trás em relação à fonte canônica em `plugins/`, e nenhum gate percebeu.
 *
 * ── O QUE ISSO CAUSOU (medido, não hipotético) ───────────────────────────────────────────
 * A skill `release-loop` foi corrigida na fonte (`plugins/almanaque-dev/`), mas as cópias
 * continuaram instruindo `git commit --no-verify`. Agente que abre o workspace pelo DSH ou pelo
 * ZCode lê a CÓPIA, não a fonte — ou seja, a correção não chegava a quem obedece.
 *
 * ── O QUE ELE FAZ ────────────────────────────────────────────────────────────────────────
 *   plugins/almanaque-dev/    skills+agents -> .zcode/       (ZCode / Claude-like)
 *   plugins/almanaque-dev/    skills        -> .dsh/skills/  (DeepSeek Harness)
 *   plugins/almanaque-design/ skills+agents -> .zcode/       (idem)
 *   plugins/almanaque-design/ skills        -> .dsh/skills/
 *   plugins/almanaque-design/ agents        -> .dsh/agents/
 *
 * A fonte canônica é SEMPRE `plugins/`. Editar os espelhados à mão não adianta: eles são
 * sobrescritos na próxima sincronização — e agora a divergência é detectada (`--check`).
 *
 *   node scripts/sync-agents.mjs            # sincroniza
 *   node scripts/sync-agents.mjs --check    # só relata divergência: sai 1 se houver (para CI)
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.slice(2).includes('--check');

const DEV = join(repoRoot, 'plugins/almanaque-dev');
const DSN = join(repoRoot, 'plugins/almanaque-design');

let drift = false;
const linhas = [];

const rel = (p) => relative(repoRoot, p).replace(/\\/g, '/');

/** Conteúdo de todos os arquivos de um diretório, para comparar sem shell out. */
function snapshot(dir) {
  const mapa = new Map();
  if (!existsSync(dir)) return mapa;
  const andar = (atual) => {
    for (const nome of readdirSync(atual)) {
      const p = join(atual, nome);
      const st = statSync(p);
      if (st.isDirectory()) andar(p);
      else mapa.set(relative(dir, p).replace(/\\/g, '/'), readFileSync(p));
    }
  };
  andar(dir);
  return mapa;
}

function iguais(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  /* Um item de 1º nível pode ser ARQUIVO (ex.: `plugins/almanaque-dev/agents/fonte-scout.md`),
     não só diretório. Comparar arquivo por `snapshot` dava ENOTDIR em `readdirSync` — o defeito
     apareceu na primeira execução. */
  const aArquivo = statSync(a).isFile();
  const bArquivo = statSync(b).isFile();
  if (aArquivo !== bArquivo) return false;
  if (aArquivo) return readFileSync(a).equals(readFileSync(b));
  const sa = snapshot(a);
  const sb = snapshot(b);
  if (sa.size !== sb.size) return false;
  for (const [k, v] of sa) {
    const outro = sb.get(k);
    if (!outro || !v.equals(outro)) return false;
  }
  return true;
}

/** Copia os itens de 1º nível, sem remover sobras. */
function copy(src, dst) {
  if (!existsSync(src)) return;
  for (const nome of readdirSync(src)) {
    const de = join(src, nome);
    const para = join(dst, nome);
    if (existsSync(para) && iguais(de, para)) continue;
    drift = true;
    linhas.push(`atualizar ${rel(para)}`);
    if (!check) {
      rmSync(para, { recursive: true, force: true });
      cpSync(de, para, { recursive: true });
    }
  }
}

/** Remove do destino o que não existe em nenhuma origem. */
function prune(dst, origens) {
  if (!existsSync(dst)) return;
  for (const nome of readdirSync(dst)) {
    if (origens.some((o) => existsSync(join(o, nome)))) continue;
    drift = true;
    linhas.push(`remover   ${rel(join(dst, nome))}`);
    if (!check) rmSync(join(dst, nome), { recursive: true, force: true });
  }
}

// --- skills: os dois plugins espelham nos dois escopos ------------------------------------
copy(join(DEV, 'skills'), join(repoRoot, '.zcode/skills'));
copy(join(DEV, 'skills'), join(repoRoot, '.dsh/skills'));
copy(join(DSN, 'skills'), join(repoRoot, '.zcode/skills'));
copy(join(DSN, 'skills'), join(repoRoot, '.dsh/skills'));

// --- agents (papéis) ---------------------------------------------------------------------
copy(join(DEV, 'agents'), join(repoRoot, '.zcode/agents'));
copy(join(DSN, 'agents'), join(repoRoot, '.zcode/agents'));
copy(join(DSN, 'agents'), join(repoRoot, '.dsh/agents'));

// --- sobras, depois de TODAS as cópias ---------------------------------------------------
prune(join(repoRoot, '.zcode/skills'), [join(DEV, 'skills'), join(DSN, 'skills')]);
prune(join(repoRoot, '.zcode/agents'), [join(DEV, 'agents'), join(DSN, 'agents')]);
prune(join(repoRoot, '.dsh/skills'), [join(DEV, 'skills'), join(DSN, 'skills')]);
prune(join(repoRoot, '.dsh/agents'), [join(DSN, 'agents')]);

for (const l of linhas) console.log(`  ${l}`);

if (!drift) {
  console.log('  ok: escopos locais sincronizados com os plugins (nada a fazer).');
} else if (check) {
  console.error(
    `\n  DRIFT: ${linhas.length} item(ns) divergem. Rode \`pnpm agents:sync\` e commite.`,
  );
  process.exit(1);
} else {
  console.log('  ok: escopos locais atualizados a partir dos plugins.');
}
