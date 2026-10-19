/**
 * Teste do "ignored build step" (`scripts/ignore-build.mjs`).
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * O contrato da Vercel é invertido em relação ao costume: saída 0 = PULAR, saída 1 = CONSTRUIR.
 * Errar para o lado de "pular" deixa a PRODUÇÃO DESATUALIZADA EM SILÊNCIO — e o silêncio é o pior
 * parte: a Vercel não marca falha, o deploy simplesmente não acontece. Errar para "construir"
 * desperdiça alguns segundos de CPU.
 *
 * Os dois erros não têm o mesmo custo, e é isso que os testes travam: os casos de ambiguidade
 * têm de CONSTRUIR.
 *
 * Os testes rodam contra um repositório git REAL em diretório temporário, criando commits de
 * verdade. A lógica depende de `git diff --quiet`, cujo código de saída (0 = igual, 1 = diferente)
 * se confunde facilmente com o da decisão — um teste com git de mentira não pegaria isso.
 *
 *   node --test apps/web/scripts/ignore-build.test.mjs
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { decidir, CAMINHOS_RELEVANTES } from './ignore-build.mjs';

let repo;
const git = (args) =>
  execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
const sha = (ref = 'HEAD') => git(['rev-parse', ref]);

function commitar(caminho, conteudo, msg) {
  const abs = join(repo, caminho);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, conteudo);
  git(['add', caminho]);
  git(['-c', 'user.email=t@t.t', '-c', 'user.name=T', 'commit', '-q', '-m', msg]);
  return sha();
}

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'ignore-build-'));
  git(['init', '-q']);
  git(['config', 'user.email', 't@t.t']);
  git(['config', 'user.name', 'T']);
  mkdirSync(join(repo, 'docs'), { recursive: true });
  writeFileSync(join(repo, 'docs', 'a.md'), 'inicio');
  mkdirSync(join(repo, 'apps/web/app'), { recursive: true });
  writeFileSync(join(repo, 'apps/web/app/page.tsx'), 'export default 1;');
  git(['add', '.']);
  git(['commit', '-q', '-m', 'base']);
});

after(() => {
  if (repo) rmSync(repo, { recursive: true, force: true });
});

describe('ignore-build — o que obriga rebuild', () => {
  test('commit só em docs/ NÃO constrói (é o caso dos 63% medidos)', () => {
    const base = sha();
    const novo = commitar('docs/b.md', 'nota', 'docs: nota');
    const r = decidir({ repoRoot: repo, commitSha: novo, previousSha: base });
    assert.equal(r.pular, true, r.motivo);
  });

  test('commit em apps/web CONSTRÓI', () => {
    const base = sha();
    const novo = commitar('apps/web/app/page.tsx', 'export default 2;', 'feat: pagina');
    const r = decidir({ repoRoot: repo, commitSha: novo, previousSha: base });
    assert.equal(r.pular, false, r.motivo);
    assert.match(r.motivo, /há mudanças/);
  });

  test('commit em packages/ (dependência do app) CONSTRÓI', () => {
    const base = sha();
    const novo = commitar('packages/domain/src/index.ts', 'export const x = 1;', 'feat: domain');
    const r = decidir({ repoRoot: repo, commitSha: novo, previousSha: base });
    assert.equal(r.pular, false, r.motivo);
  });

  test('mudança no pnpm-lock.yaml CONSTRÓI', () => {
    const base = sha();
    const novo = commitar('pnpm-lock.yaml', 'lockfileVersion: 9', 'chore: deps');
    const r = decidir({ repoRoot: repo, commitSha: novo, previousSha: base });
    assert.equal(r.pular, false, r.motivo);
  });

  test('mudança no package.json da raiz CONSTRÓI', () => {
    const base = sha();
    const novo = commitar('package.json', '{"name":"x"}', 'chore: raiz');
    const r = decidir({ repoRoot: repo, commitSha: novo, previousSha: base });
    assert.equal(r.pular, false, r.motivo);
  });
});

describe('ignore-build — ambiguidade CONSTRÓI (fail-safe)', () => {
  test('sem VERCEL_GIT_COMMIT_SHA -> constrói', () => {
    const r = decidir({ repoRoot: repo, commitSha: undefined, previousSha: sha() });
    assert.equal(r.pular, false);
    assert.match(r.motivo, /COMMIT_SHA ausente/);
  });

  test('raiz do repositório ausente -> constrói', () => {
    const r = decidir({ repoRoot: null, commitSha: sha(), previousSha: sha() });
    assert.equal(r.pular, false);
    assert.match(r.motivo, /raiz/);
  });

  test('SHA base inexistente (clonagem rasa) -> constrói', () => {
    /* A Vercel faz clone raso. Se o commit anterior não estiver no clone, não dá para comparar —
       e "não dá para comparar" NÃO pode virar "pular". */
    const r = decidir({
      repoRoot: repo,
      commitSha: sha(),
      previousSha: '0000000000000000000000000000000000000000',
    });
    assert.equal(r.pular, false);
    assert.match(r.motivo, /não está no clone/);
  });

  test('sem previousSha cai para HEAD^ e ainda decide certo', () => {
    const base = sha();
    const novo = commitar('docs/c.md', 'x', 'docs: c');
    // previousSha ausente: usa HEAD^, que é o commit base
    const r = decidir({ repoRoot: repo, commitSha: novo, previousSha: undefined });
    assert.equal(r.pular, true, r.motivo);
    assert.match(r.motivo, /HEAD\^/);
    assert.ok(base);
  });
});

describe('ignore-build — o contrato da Vercel', () => {
  test('CAMINHOS_RELEVANTES inclui o app e as dependências compartilhadas', () => {
    // Se alguém enxugar esta lista demais, o site pode ficar desatualizado sem aviso.
    for (const esperado of ['apps/web', 'packages', 'pnpm-lock.yaml', 'package.json']) {
      assert.ok(CAMINHOS_RELEVANTES.includes(esperado), `falta ${esperado}`);
    }
  });

  test('a decisão devolve sempre { pular, motivo }', () => {
    const r = decidir({ repoRoot: repo, commitSha: sha(), previousSha: sha() });
    assert.equal(typeof r.pular, 'boolean');
    assert.equal(typeof r.motivo, 'string');
    assert.ok(r.motivo.length > 0);
  });
});
