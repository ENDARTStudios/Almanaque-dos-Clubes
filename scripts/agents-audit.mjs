#!/usr/bin/env node
/**
 * AUDITORIA DAS INSTRUÇÕES DE AGENTE — Almanaque dos Clubes.
 *
 * ── DE ONDE VEM ESTA IDEIA ────────────────────────────────────────────────────────────────
 * Do ECC (github.com/affaan-m/ECC, MIT), avaliado para adoção neste projeto. Do catálogo dele
 * (311 skills, 71 agentes, 23 pacotes de regras) quase nada se aplica: as regras são checklists
 * em prosa, mais fracas que os gates objetivos que este projeto já tem (gitleaks, security-gate,
 * ui:audit:ci), e o AgentShield — o scanner de configuração de agente — é específico para Claude
 * Code, que este projeto não usa.
 *
 * O que valia a pena é a PREMISSA do AgentShield: **arquivo de instrução de agente é configuração
 * executável**. Um agente obedece o que está escrito ali, então instrução errada vira ação errada.
 *
 * ── O QUE ISSO ENCONTROU, NO PRIMEIRO DIA ────────────────────────────────────────────────
 * Este projeto tem 60 arquivos de instrução (skills, agentes, AGENTS.md) e NENHUM gate do CI os
 * validava. Rodando a ideia contra eles, três instruções estavam FALSAS:
 *
 *   1. `release-loop` mandava `git commit --no-verify` porque "o hook pre-commit está quebrado".
 *      O bug (getFilename is not a function, ESLint 10) foi CORRIGIDO fixando eslint@^9, e o hook
 *      foi verificado funcionando. Ou seja: a skill ensinava a pular verificação que funciona —
 *      e era obedecida. Numa única sessão, 8 commits saíram com --no-verify por causa dela.
 *   2. `web-accessibility-wcag` apontava para `docs/ACCESSIBILITY.md`.
 *   3. `ux-copywriter` apontava para `docs/HERO-NUMEROS.md`.
 *      Os dois documentos existem, mas foram MOVIDOS para `docs/07-operations-marketing/` na
 *      reorganização de docs (7cb0a52). A instrução mandava ler um caminho que não existe mais.
 *
 * ── ESCOPO, DECLARADO ─────────────────────────────────────────────────────────────────────
 * Só o que é OBJETIVAMENTE verificável:
 *   - caminho citado em backtick que não existe no disco;
 *   - `pnpm <script>` citado que não está no package.json correspondente;
 *   - forma de segredo (AWS, GitHub, chave privada, JWT) em arquivo de instrução;
 *   - comando que contorna verificação (`--no-verify`, push forçado) — AVISO, não bloqueio,
 *     porque existe uso legítimo; o aviso existe para a justificativa ser explícita.
 * NÃO julga prosa, não avalia qualidade de instrução, não detecta instrução maliciosa por
 * semântica. Fingir isso seria pior que não ter a ferramenta.
 *
 * ── FALSOS POSITIVOS ─────────────────────────────────────────────────────────────────────
 * Um scanner ingênuo produz ruído — medido: a primeira versão acusou 23 "problemas", dos quais a
 * maioria era prosa ("skip silencioso proibido" é uma PROIBIÇÃO) ou exemplo do que NÃO fazer
 * ("Não tente `pnpm tsx scripts/x.ts`"). Ruído ensina a ignorar o relatório, que é o oposto do
 * objetivo. Por isso o que é exemplo legítimo fica numa lista DECLARADA abaixo, com o motivo —
 * visível e discutível, em vez de escondido por regex esperto.
 *
 *   pnpm agents:audit        # relatório legível
 *   pnpm agents:audit --json # saída para máquina
 *   pnpm agents:audit --ci   # sai 1 se houver bloqueio
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const ciMode = argv.includes('--ci');

/**
 * O que conta como "instrução de agente".
 * `.claude/` entra pelo mesmo motivo que `.dsh/` e `.zcode/`: são arquivos que um agente lê e
 * obedece. `docs/` fica FORA de propósito — documentação descreve, não instrui, e varrer prosa
 * produz o ruído que este arquivo existe para evitar.
 */
const RAIZES = ['.dsh/skills', '.zcode', 'plugins', '.claude'];
const ARQUIVOS_SOLTOS = ['AGENTS.md', 'CLAUDE.md', 'docs/AGENTS.md'];
const EXTS = new Set(['.md', '.mdc']);

/**
 * Isenções DECLARADAS — caminho/script citado que não existe mas não é defeito.
 * Cada entrada precisa de motivo. Sem motivo, é dívida disfarçada.
 */
const ISENCOES_CAMINHO = new Map([
  ['scripts/x.ts', 'exemplo do que NÃO fazer ("Não tente `pnpm tsx scripts/x.ts`")'],
  ['apps/web/tmp-shot.mjs', 'condicional explícito na própria frase ("se o utilitário existir")'],
  ['docs/worklog.md', 'formato citado como referência, o log real vive em docs/worklogs/'],
]);
const ISENCOES_SCRIPT = new Map([
  ['tsx', 'comando do runner, não script deste package.json'],
  ['info', 'subcomando do npm/pnpm ("pnpm info <pacote>")'],
  ['audit', 'subcomando do pnpm'],
  ['lint-staged', 'binário do pacote, não script'],
  ['exec', 'subcomando'],
  ['why', 'subcomando do pnpm'],
  ['outdated', 'subcomando do pnpm'],
]);

/** Formas de segredo. Um arquivo de instrução nunca deve conter um. */
const SEGREDOS = [
  { id: 'aws', re: /AKIA[0-9A-Z]{16}/, o: 'chave de acesso AWS' },
  { id: 'github', re: /gh[pousr]_[A-Za-z0-9]{36,}/, o: 'token do GitHub' },
  { id: 'chave-privada', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, o: 'chave privada' },
  { id: 'jwt', re: /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{5,}/, o: 'JWT' },
  { id: 'slack', re: /xox[baprs]-[0-9A-Za-z-]{10,}/, o: 'token do Slack' },
];

/**
 * Comandos que contornam verificação. AVISO, não bloqueio: existe uso legítimo (um hook
 * irremediavelmente quebrado, por exemplo) — mas o uso precisa estar justificado no próprio
 * arquivo, senão a próxima pessoa herda a armadilha sem saber.
 */
/**
 * O `^` com `m` é essencial e foi um falso positivo medido: sem ele, o aviso dispara também
 * quando o arquivo *explica* que a instrução antiga usava o comando. Ensinar que algo é ruim não
 * é fazer a coisa ruim. Só conta como contorno quando é COMANDO no início da linha — que é como
 * um agente executa.
 */
const CONTORNOS = [
  {
    id: 'no-verify',
    re: /^\s*\$?\s*(HUSKY=0\s+)?git\s+commit[^\n]*--no-verify/m,
    o: 'commit pula o hook pre-commit',
  },
  {
    id: 'force-push',
    re: /^\s*\$?\s*git\s+push[^\n]*\s--force(?![\w-])/m,
    o: 'push forçado sem lease',
  },
  {
    id: 'hook-skip',
    re: /^\s*\$?\s*(HUSKY=0\s+)?git\s+(commit|push)[^\n]*--no-gpg-sign/m,
    o: 'pula assinatura/verificação',
  },
];

function arquivos() {
  const achados = [];
  const colher = (dir) => {
    const abs = join(repoRoot, dir);
    if (!existsSync(abs)) return;
    for (const nome of readdirSync(abs)) {
      if (nome === 'node_modules' || nome.startsWith('.')) continue;
      const p = join(abs, nome);
      if (statSync(p).isDirectory()) colher(join(dir, nome));
      else if (EXTS.has(extname(nome))) achados.push(relative(repoRoot, p).replace(/\\/g, '/'));
    }
  };
  for (const r of RAIZES) colher(r);
  for (const f of ARQUIVOS_SOLTOS) if (existsSync(join(repoRoot, f))) achados.push(f);
  // As cópias sincronizadas (.dsh, .zcode) repetem o conteúdo da fonte em plugins/. Auditar as
  // três gera o mesmo defeito três vezes no relatório, o que infla a contagem e esconde o plural
  // real. Fica a fonte; as cópias aparecem agrupadas.
  return [...new Set(achados)].sort();
}

/** Scripts declarados em cada package.json do monorepo. */
function scriptsDisponiveis() {
  const sets = { raiz: new Set() };
  const raiz = join(repoRoot, 'package.json');
  if (existsSync(raiz)) {
    for (const k of Object.keys(JSON.parse(readFileSync(raiz, 'utf8')).scripts ?? {}))
      sets.raiz.add(k);
  }
  return sets;
}

function auditar() {
  const lista = arquivos();
  const scripts = scriptsDisponiveis();
  const bloqueios = [];
  const avisos = [];

  for (const arq of lista) {
    const txt = readFileSync(join(repoRoot, arq), 'utf8');

    // (1) Caminhos citados em backtick que não existem.
    for (const m of txt.matchAll(
      /`((?:docs|apps|packages|plugins|scripts|\.dsh|\.zcode|\.claude)\/[\w./-]+\.\w+)`/g,
    )) {
      const alvo = m[1];
      if (ISENCOES_CAMINHO.has(alvo)) continue;
      if (!existsSync(join(repoRoot, alvo))) {
        bloqueios.push({
          regra: 'caminho-inexistente',
          arquivo: arq,
          detalhe: `\`${alvo}\` não existe no repositório`,
          correcao: 'corrija o caminho ou registre a isenção com motivo',
        });
      }
    }

    // (2) `pnpm <script>` que não existe no package.json.
    for (const m of txt.matchAll(/`pnpm\s+(?:run\s+)?([a-z][\w:-]*)`/g)) {
      const s = m[1];
      if (ISENCOES_SCRIPT.has(s) || scripts.raiz.has(s)) continue;
      bloqueios.push({
        regra: 'script-inexistente',
        arquivo: arq,
        detalhe: `\`pnpm ${s}\` não está em package.json`,
        correcao: 'renomeie para o script real ou remova a instrução',
      });
    }

    // (3) Segredo em arquivo de instrução.
    for (const s of SEGREDOS) {
      const m = txt.match(s.re);
      if (m) {
        bloqueios.push({
          regra: 'segredo',
          arquivo: arq,
          detalhe: `${s.o} no arquivo (começa com "${m[0].slice(0, 8)}…")`,
          correcao:
            'remova e rotacione o segredo — arquivo de instrução vai para o histórico do git',
        });
      }
    }

    // (4) Contorno de verificação — aviso.
    for (const c of CONTORNOS) {
      const m = txt.match(c.re);
      if (m) {
        avisos.push({
          regra: 'contorno-de-verificacao',
          arquivo: arq,
          detalhe: `${c.o}: "${m[0].slice(0, 60).trim()}"`,
          correcao:
            'se o motivo ainda vale, diga POR QUE no arquivo; se não vale, remova a instrução',
        });
      }
    }
  }

  /**
   * AGRUPAMENTO — um defeito, uma linha.
   *
   * As skills vivem em `plugins/` (fonte) e são espelhadas em `.dsh/` e `.zcode/`. Sem agrupar, um
   * único defeito aparece três vezes no relatório: a contagem infla, o plural real se esconde e a
   * pessoa não sabe qual dos três corrigir. A fonte canônica vem primeiro; as cópias viram
   * "também em".
   *
   * Pré-requisito declarado: corrigir a FONTE. As cópias são geradas por `pnpm agents:sync`, então
   * editá-las à mão adianta nada.
   */
  const agrupar = (achados) => {
    const porDefeito = new Map();
    for (const a of achados) {
      const chave = `${a.regra}|${a.detalhe}`;
      if (!porDefeito.has(chave)) porDefeito.set(chave, { ...a, tambemEm: [] });
      else porDefeito.get(chave).tambemEm.push(a.arquivo);
    }
    for (const v of porDefeito.values()) {
      // A fonte canônica é o arquivo em `plugins/`; as demais são espelhos.
      if (!v.arquivo.startsWith('plugins/') && v.tambemEm.length) {
        const canonica = v.tambemEm.find((c) => c.startsWith('plugins/'));
        if (canonica) {
          v.tambemEm = v.tambemEm.filter((c) => c !== canonica).concat(v.arquivo);
          v.arquivo = canonica;
        }
      }
    }
    return [...porDefeito.values()];
  };

  return { lista, bloqueios: agrupar(bloqueios), avisos: agrupar(avisos) };
}

const { lista, bloqueios, avisos } = auditar();

if (asJson) {
  console.log(
    JSON.stringify(
      {
        arquivos: lista.length,
        bloqueios,
        avisos,
        veredito: bloqueios.length ? 'falhou' : 'verde',
      },
      null,
      2,
    ),
  );
  process.exit(ciMode && bloqueios.length ? 1 : 0);
}

console.log('\n  ── AUDITORIA DAS INSTRUÇÕES DE AGENTE ───────────────────────────');
console.log(`  ${lista.length} arquivo(s) que um agente lê e obedece\n`);

if (bloqueios.length) {
  console.log(`  BLOQUEIOS (${bloqueios.length})`);
  for (const b of bloqueios) {
    console.log(`\n    ✖ ${b.arquivo}`);
    console.log(`      ${b.detalhe}`);
    if (b.tambemEm?.length) console.log(`      também em: ${b.tambemEm.join(', ')}`);
    console.log(`      -> ${b.correcao}`);
  }
} else {
  console.log('  BLOQUEIOS: nenhum — todo caminho e script citado existe.');
}

if (avisos.length) {
  console.log(`\n  AVISOS (${avisos.length}) — contorno de verificação`);
  for (const a of avisos) {
    console.log(`\n    ⚠ ${a.arquivo}`);
    console.log(`      ${a.detalhe}`);
    if (a.tambemEm?.length) console.log(`      também em: ${a.tambemEm.join(', ')}`);
    console.log(`      -> ${a.correcao}`);
  }
} else {
  console.log('\n  AVISOS: nenhum contorno de verificação.');
}

console.log('\n  ───────────────────────────────────────────────────────────────');
if (bloqueios.length) {
  console.log(`  VERMELHO — ${bloqueios.length} instrução(ões) apontam para algo que não existe.`);
  console.log('  Agente obedece o que lê: instrução falsa vira ação errada.\n');
} else {
  console.log(`  VERDE — ${lista.length} arquivos de instrução conferem com o repositório.`);
  if (avisos.length)
    console.log('  Há contornos de verificação acima: confirme que o motivo ainda vale.\n');
  else console.log('');
}

process.exit(bloqueios.length ? 1 : 0);
