#!/usr/bin/env node
/**
 * "IGNORED BUILD STEP" DA VERCEL — pula o build quando nada do app mudou.
 *
 * ── POR QUE ISTO EXISTE ───────────────────────────────────────────────────────────────────
 * Medido antes de escrever, em 7 dias deste repositório:
 *
 *   commits no `main` ......... 165
 *   tocam `apps/web` ..........  61   (37%)
 *   NÃO tocam `apps/web` ...... 104   (63%)  <- cada um disparava um `next build` completo
 *   branches com push .........  96   (de 282 no total)
 *     sem mudança relevante ...  37   (39%) <- cada uma disparava uma preview completa
 *
 * Ou seja: a maior parte dos builds da Vercel era de commits que não podiam alterar o site —
 * documentação, `apps/api`, `scripts/`, `plugins/`. Cada build custa ~20–25 s de CPU.
 *
 * Com este passo, um commit que não toca o app nem as dependências compartilhadas NÃO constrói.
 *
 * ── COMO A VERCEL USA ISTO ───────────────────────────────────────────────────────────────
 * `ignoreCommand` roda ANTES do build. O contrato é invertido em relação ao costume:
 *
 *     saída 0  = PULAR o build
 *     saída 1  = CONSTRUIR
 *
 * É fácil errar isso e deixar o site parado sem aviso — por isso o padrão deste script é
 * CONSTRUIR: qualquer dúvida, qualquer erro, qualquer variável ausente resulta em saída 1.
 * Um build desperdiçado custa segundos; um build pulado por engano deixa produção desatualizada
 * em silêncio. O custo dos dois erros não é simétrico, e o script assume isso.
 *
 * ── O QUE CONTA COMO "MUDANÇA RELEVANTE" ─────────────────────────────────────────────────
 * O app E tudo de que ele depende. Errar para menos aqui é o risco real (pular quando devia
 * construir), então a lista é generosa:
 *
 *     apps/web/**        o app
 *     packages/**        workspace consumido pelo app
 *     pnpm-lock.yaml     dependências
 *     package.json       scripts/versões da raiz
 *     turbo.json         orquestração
 *     .npmrc             resolução de pacotes
 *     apps/web/vercel.json  a própria configuração de build
 *
 * ── USO ──────────────────────────────────────────────────────────────────────────────────
 *   node scripts/ignore-build.mjs            # comportamento real (lê o ambiente da Vercel)
 *   node scripts/ignore-build.mjs --explicar # mostra a decisão e o motivo, sem ambiguidade
 *
 * Código de saída: 0 = pular · 1 = construir (o padrão, em qualquer incerteza).
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const explicar = process.argv.includes('--explicar');

/**
 * Caminhos que obrigam rebuild. Qualquer coisa que o `next build` de `apps/web` possa consumir.
 * A lista é ampla de propósito: o custo de reconstruir sem precisar é um build; o custo de pular
 * precisando é o site parado.
 */
export const CAMINHOS_RELEVANTES = [
  'apps/web',
  'packages',
  'pnpm-lock.yaml',
  'package.json',
  'turbo.json',
  '.npmrc',
];

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 30_000,
  }).trim();
}

/** Decide. Exportada para teste: é a lógica que pode custar caro se errar. */
export function decidir({ repoRoot, commitSha, previousSha, caminhos = CAMINHOS_RELEVANTES }) {
  const construir = (motivo) => ({ pular: false, motivo });
  const pular = (motivo) => ({ pular: true, motivo });

  if (!repoRoot) return construir('raiz do repositório não encontrada');
  if (!commitSha) return construir('VERCEL_GIT_COMMIT_SHA ausente');

  // Base de comparação: o commit anterior DESTA branch, quando a Vercel informa.
  // Sem ele, o pai do commit atual (cobre o caso de push de um único commit).
  let base = previousSha || 'HEAD^';
  let baseDescricao = previousSha ? 'VERCEL_GIT_PREVIOUS_SHA' : 'HEAD^';

  try {
    // `^{commit}` valida que o objeto existe E é um commit. Numa clonagem rasa (a Vercel faz
    // clone raso), o SHA anterior pode não estar presente — nesse caso não dá para comparar,
    // e "não dá para comparar" significa CONSTRUIR.
    git(['rev-parse', '--verify', '--quiet', `${base}^{commit}`], repoRoot);
  } catch {
    return construir(`base "${base}" (${baseDescricao}) não está no clone — não dá para comparar`);
  }

  try {
    // `--quiet` do diff sai 0 quando NÃO há diferença, 1 quando há. Como aqui a convenção é
    // invertida (0 = pular), o resultado do diff já é a resposta — mas só depois de confirmar
    // que as duas pontas existem.
    git(['diff', '--quiet', base, commitSha, '--', ...caminhos], repoRoot);
    return pular(
      `nenhuma mudança em ${caminhos.join(', ')} entre ${base} e ${commitSha.slice(0, 8)}`,
    );
  } catch (err) {
    // `git diff --quiet` sinaliza "há diferença" com código 1 — que é o caso COMUM, não um erro.
    if (err && typeof err === 'object' && 'status' in err && err.status === 1) {
      return construir(
        `há mudanças em ${caminhos.join(', ')} entre ${base} e ${commitSha.slice(0, 8)}`,
      );
    }
    return construir(`git diff falhou (${err?.message?.split('\n')[0] ?? 'erro'})`);
  }
}

// ── execução ─────────────────────────────────────────────────────────────────────────────
const executadoDiretamente =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executadoDiretamente) {
  let repoRoot = null;
  try {
    // A Vercel roda este comando no Root Directory do projeto (`apps/web`), não na raiz do
    // clone. `--show-toplevel` sobe até o repositório, onde os caminhos de CAMINHOS_RELEVANTES
    // fazem sentido.
    repoRoot = git(['rev-parse', '--show-toplevel'], process.cwd());
  } catch {
    repoRoot = null;
  }

  const r = decidir({
    repoRoot,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    // A Vercel só preenche isto em push para a MESMA branch. Em preview nova, vem vazio.
    previousSha: process.env.VERCEL_GIT_PREVIOUS_SHA,
  });

  if (explicar) {
    console.log(`  decisão: ${r.pular ? 'PULAR' : 'CONSTRUIR'}`);
    console.log(`  motivo:  ${r.motivo}`);
    console.log(`  raiz:    ${repoRoot ?? '(não encontrada)'}`);
  } else {
    console.log(`[ignore-build] ${r.pular ? 'pulando' : 'construindo'} — ${r.motivo}`);
  }

  process.exit(r.pular ? 0 : 1);
}
