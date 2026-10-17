#!/usr/bin/env node
/**
 * PRÉ-VOO DE DIFF — Almanaque dos Clubes.
 *
 * ── DE ONDE VEM ESTA IDEIA ────────────────────────────────────────────────────────────────
 * Do Plandex (github.com/plandex-ai/plandex, MIT), que foi avaliado para adoção neste projeto e
 * NÃO adotado: última release em jul/2025, projeto em fim de vida (o Plandex Cloud encerrou em
 * out/2025), sem binário para Windows — e, sobretudo, o que ele resolve (contexto grande,
 * execução autônoma de tarefas longas) não é o gargalo deste projeto.
 *
 * O que valia a pena ficar é uma ideia só, e é esta: o "cumulative diff review sandbox". O
 * Plandex mostra o que mudou, com os portões rodando, ANTES de virar commit. Aqui isso é feito
 * com o que o projeto já tem, sem servidor, sem Postgres e sem chave de modelo.
 *
 * ── O PROBLEMA REAL QUE ISTO ATACA ────────────────────────────────────────────────────────
 * Nesta base, o erro que mais custou caro não foi código quebrado: foi eu declarar um item
 * "verificado" apoiado em portão verde que não cobria o caso. Três exemplos, todos reais:
 *   - `tsc` limpo num componente que exibia `pages.admin.title` na tela (o typecheck valida o
 *     TIPO de `t()`, não a EXISTÊNCIA da chave);
 *   - build compilando com o gate de operador DEPOIS do `<h1>`, anunciando ferramenta restrita;
 *   - teste passando num seletor que abria a janela do sistema operacional.
 * Em todos, a pergunta "o que os portões NÃO cobrem aqui?" teria evitado o retrabalho.
 *
 * Por isso este relatório tem DUAS partes, e a segunda é a que importa: o que passou, e o que
 * NENHUM portão automático cobre nas mudanças de agora.
 *
 * ── USO ───────────────────────────────────────────────────────────────────────────────────
 *   pnpm preflight                 # portões dos pacotes tocados
 *   pnpm preflight --build         # inclui o build dos pacotes tocados (lento)
 *   pnpm preflight --list          # só o escopo das mudanças, sem rodar portão
 *   pnpm preflight --json          # saída para máquina
 *
 * Código de saída: 0 = tudo verde · 1 = algum portão falhou · 2 = erro de uso.
 *
 * NÃO MODIFICA NADA. Não faz stage, não commita, não escreve arquivo. Rodar duas vezes seguidas
 * dá o mesmo resultado.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const soLista = argv.includes('--list');
const comBuild = argv.includes('--build');

/** Uma mudança que não é código nosso e não deve disparar portão. */
const IGNORAR = [
  /^\.tmp\//,
  /^\.vercel\//,
  /^node_modules\//,
  /\.(png|jpe?g|gif|webp|svg|ico|pdf)$/i,
  /^rsssf-/,
];

/**
 * Raízes de pacote, na ordem em que devem ser testadas (a mais específica primeiro).
 * `null` = mudança na raiz do repo, que pode afetar todo mundo.
 */
const PACOTES = [
  { nome: 'web', dir: 'apps/web' },
  { nome: 'api', dir: 'apps/api' },
  { nome: 'worker', dir: 'apps/worker' },
  { nome: 'domain', dir: 'packages/domain' },
];

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

/**
 * Arquivos alterados: ainda-não-commitados (staged + unstaged) e não rastreados.
 *
 * `git status --porcelain -z` em vez de `git diff`: pega os três casos de uma vez, e o `-z`
 * evita que um nome com espaço vire duas entradas — nesta base existem diretórios com espaço
 * ("Almanaque dos Clubes"), então isso não é hipótese.
 */
function mudancas() {
  const cru = git(['status', '--porcelain', '-z', '--untracked-files=all']);
  if (!cru) return [];
  const partes = cru.split('\0').filter(Boolean);
  const saida = [];
  for (const parte of partes) {
    // Formato: "XY caminho" (e, em rename, "XY novo\0antigo").
    const marca = parte.slice(0, 2);
    const caminho = parte.slice(3);
    if (!caminho) continue;
    if (marca === '!!') continue;
    saida.push({ marca: marca.trim() || '??', caminho: caminho.replace(/\\/g, '/') });
  }
  return saida;
}

/**
 * A qual pacote pertence um caminho.
 *
 * Caminho fora de qualquer pacote conhecido (ex.: `package.json` da raiz, `turbo.json`,
 * `plugins/**`) devolve `null` — e a mudança de raiz marca TODOS os pacotes, porque
 * `package.json`, lockfile e config de TypeScript mudam o build de todo mundo.
 */
export function pacoteDe(caminho) {
  const achado = PACOTES.find((p) => caminho === p.dir || caminho.startsWith(p.dir + '/'));
  return achado ? achado.nome : null;
}

/** Portões declarados por um pacote, lidos do próprio `package.json`. */
function portoes(pacote) {
  const caminho = join(repoRoot, pacote.dir, 'package.json');
  if (!existsSync(caminho)) return null;
  const pkg = JSON.parse(readFileSync(caminho, 'utf8'));
  const scripts = pkg.scripts ?? {};
  // Ordem: do mais barato e mais decisivo para o mais caro. O build é opt-in.
  const desejados = [
    ['typecheck', true],
    ['lint', true],
    ['test', true],
    ['build', comBuild],
  ];
  return desejados
    .filter(([nome, ativo]) => ativo && scripts[nome])
    .map(([nome]) => ({ nome, comando: scripts[nome], pkg: pkg.name ?? pacote.dir }));
}

function roda(comando, cwd) {
  const inicio = Date.now();
  try {
    const saida = execFileSync('pnpm', ['run', '--silent', comando], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      timeout: TETO_MS,
    });
    return { ok: true, ms: Date.now() - inicio, saida };
  } catch (err) {
    const estourou = err.killed || err.signal === 'SIGTERM';
    return {
      ok: false,
      estourou,
      ms: Date.now() - inicio,
      saida: `${err.stdout ?? ''}${err.stderr ?? ''}`,
    };
  }
}

/**
 * ASSINATURAS DE AMBIENTE — falha que não é do código.
 *
 * Descoberto rodando a própria ferramenta: `api:test` falhou em 154s, e a causa era o ambiente
 * local (o Postgres da máquina responde `Authentication failed against database server, the
 * provided database credentials for 'almanaque' are not valid`). Não havia uma linha de código
 * de `apps/api` alterada.
 *
 * Essa distinção importa: relatar "portão VERMELHO" quando o problema é a máquina treina a pessoa
 * a ignorar o vermelho — que é o oposto do que este script serve. E relatar "verde" seria mentir.
 * O veredito honesto é um terceiro: **não verificado aqui, verificado no CI**.
 *
 * CUSTA ALGO, e está declarado: se a suíte falhar por um defeito real cuja mensagem contenha uma
 * destas assinaturas, a ferramenta vai dizer "ambiente" no lugar de "código". Por isso a saída
 * mostra a linha que casou — para a classificação ser auditável, não mágica.
 */
const ASSINATURAS_AMBIENTE = [
  {
    re: /Authentication failed against database server/i,
    o: 'credenciais do Postgres local inválidas',
  },
  { re: /ECONNREFUSED.*5432|connect ECONNREFUSED/i, o: 'Postgres local não está acessível' },
  { re: /Can't reach database server/i, o: 'Postgres local não está acessível' },
  { re: /max retries per request limit/i, o: 'banco local sem resposta' },
  { re: /Redis|ECONNREFUSED.*6379/i, o: 'Redis local não está acessível' },
  { re: /DATABASE_URL|DIRECT_URL/, o: 'variável de banco ausente' },
];

/**
 * Classifica a falha: código, ou ambiente? Devolve a assinatura que casou, se houver.
 *
 * Exportada para teste: é a peça com mais chance de errar, e um erro aqui ou esconde defeito
 * (diz "ambiente" para falha real) ou inventa vermelho.
 */
export function classificar(erroSaida) {
  for (const a of ASSINATURAS_AMBIENTE) {
    const m = erroSaida.match(a.re);
    if (m) {
      const linha = erroSaida
        .split('\n')
        .find((l) => a.re.test(l))
        ?.trim()
        .slice(0, 120);
      return { ambiente: true, motivo: a.o, evidencia: linha ?? m[0] };
    }
  }
  return { ambiente: false };
}

/** Teto por portão. Sem isto, um teste que espera o banco pendura a rodada por minutos. */
const TETO_MS = Number(process.env.PREFLIGHT_TIMEOUT_MS ?? 240_000);

/**
 * O QUE NENHUM PORTÃO AUTOMÁTICO COBRE.
 *
 * Derivado do escopo real das mudanças, não de uma lista fixa. É a parte honesta do relatório:
 * o Plandex mostra o diff e deixa você julgar; aqui eu aponto explicitamente onde o verde não
 * significa o que parece.
 */
export function naoCoberto(arquivos) {
  const avisos = [];
  const tem = (re) => arquivos.some((a) => re.test(a.caminho));

  if (tem(/^apps\/web\/src\/(app|components)\//)) {
    avisos.push({
      o: 'Tela renderizada',
      porque:
        'typecheck, lint e teste de unidade NÃO olham o que o navegador desenha. Nesta base já passaram por eles: ' +
        'uma chave de i18n aparecendo crua na tela, uma fronteira de erro derrubando a página e um seletor abrindo a janela do sistema.',
      como: 'abra a tela, ou rode o spec de e2e que cobre a área',
    });
  }
  if (tem(/i18n\/(dictionaries|types)|i18n\/ws/)) {
    avisos.push({
      o: 'Chave de i18n',
      porque:
        'o `t()` aceita string e devolve string: chave que não existe vira o PRÓPRIO NOME na tela, e o typecheck não vê. ' +
        'Só vale para as três locales — conferir uma não basta.',
      como: 'confira as 3 locales e que a chave é a mesma que o componente pede',
    });
  }
  if (tem(/^apps\/api\/src/) && !tem(/tests?\//)) {
    avisos.push({
      o: 'Rota de API sem teste novo',
      porque:
        'mudança de rota sem teste passa por typecheck e lint sem executar nem uma vez. Nesta base uma rota nova já ' +
        'ficou 404 em produção porque nada a exercitava.',
      como: 'bata no endpoint (curl) ou acrescente um caso',
    });
  }
  if (tem(/middleware|auth|operator|permission|session|guard/i)) {
    avisos.push({
      o: 'Superfície de segurança',
      porque:
        'mudança em autenticação ou permissão não é validada por portão nenhum. Aqui a regra é explícita: NÃO afrouxe o teste ' +
        'para o código passar — conserte o código.',
      como: 'revise o caminho de recusa (401/403), não só o de sucesso',
    });
  }
  if (tem(/prisma|migrations?\//)) {
    avisos.push({
      o: 'Schema ou migração',
      porque: 'migração não é exercitada pelos portões locais; o banco de produção é canônico.',
      como: 'rode o `migration-drift` (roda no CI) e confira se é aditiva e reversível',
    });
  }
  if (tem(/\.(css)$/)) {
    avisos.push({
      o: 'Token de tema',
      porque:
        'classe de cor crua passa no build e quebra o tema. O portão objetivo é o `ui:audit:ci`, que este pré-voo não roda.',
      como: 'rode `pnpm ui:audit:ci`',
    });
  }
  if (tem(/^scripts\/|plugins\//) || tem(/\.mjs$/)) {
    avisos.push({
      o: 'Ferramenta de linha de comando',
      porque: 'script não tem teste e o lint-staged só roda prettier/eslint — não executa.',
      como: 'rode o script uma vez, com o argumento de leitura, antes de commitar',
    });
  }
  return avisos;
}

function formata(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ─────────────────────────────────────────────────────────────────────────────────────────
/**
 * Guarda de execução: `import` deste arquivo só pega as funções puras. Sem isto, o teste que
 * importa `classificar` rodaria o pré-voo inteiro como efeito colateral — e um teste que executa
 * git e pnpm não é teste, é armadilha.
 */
const executadoDiretamente =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (!executadoDiretamente) {
  // Importado: encerra aqui, deixando as exportações disponíveis.
} else {
  const todas = mudancas();
  const relevantes = todas.filter((m) => !IGNORAR.some((re) => re.test(m.caminho)));

  if (!relevantes.length) {
    if (asJson) {
      console.log(
        JSON.stringify({ mudancas: 0, portoes: [], veredito: 'nada-a-verificar' }, null, 2),
      );
    } else {
      console.log('\n  Pré-voo: nenhuma mudança de código no diretório de trabalho.');
      console.log('  (arquivos ignorados: .tmp/, mídia, dumps rsssf-*, node_modules)\n');
    }
    process.exit(0);
  }

  // Pacotes tocados. Mudança na RAIZ (fora de qualquer pacote) acende todos.
  const naRaiz = relevantes.filter((m) => pacoteDe(m.caminho) === null);
  const tocados = new Set(relevantes.map((m) => pacoteDe(m.caminho)).filter(Boolean));
  if (naRaiz.length) for (const p of PACOTES) tocados.add(p.nome);

  const selecionados = PACOTES.filter((p) => tocados.has(p.nome));

  if (!asJson) {
    console.log('\n  ── PRÉ-VOO DE DIFF ─────────────────────────────────────────────');
    console.log(
      `  ${relevantes.length} arquivo(s) alterado(s) em ${selecionados.length} pacote(s)\n`,
    );
    for (const m of relevantes) {
      const p = pacoteDe(m.caminho) ?? 'raiz';
      console.log(`    ${String(m.marca).padEnd(2)} ${m.caminho}  [${p}]`);
    }
    if (naRaiz.length) {
      console.log(
        `\n  Mudança fora de pacote (${naRaiz.length}) -> todos os pacotes entram no pré-voo.`,
      );
    }
  }

  if (soLista) {
    if (asJson)
      console.log(JSON.stringify({ arquivos: relevantes, pacotes: [...tocados] }, null, 2));
    else console.log('\n  (--list: nenhum portão foi executado)\n');
    process.exit(0);
  }

  // Portões, pacote por pacote.
  const resultados = [];
  for (const pacote of selecionados) {
    const lista = portoes(pacote);
    const cwd = join(repoRoot, pacote.dir);
    if (!lista || !lista.length) {
      // Pacote sem nenhum portão declarado: dizer "ok" seria inventar cobertura que não existe.
      resultados.push({ pacote: pacote.nome, semPortoes: true, itens: [] });
      if (!asJson) {
        console.log(`\n  ── ${pacote.nome} (${pacote.dir}) ──────────────────────────────`);
        console.log('    (nenhum portão declarado neste pacote — não há o que rodar)');
      }
      continue;
    }
    if (!asJson)
      console.log(`\n  ── ${pacote.nome} (${pacote.dir}) ──────────────────────────────`);
    const itens = [];
    for (const g of lista) {
      if (!asJson) process.stdout.write(`    ${g.nome.padEnd(10)} ... `);
      const r = roda(g.nome, cwd);
      // A classificação só faz sentido quando FALHOU.
      const classe = r.ok ? { ambiente: false } : classificar(r.saida);
      itens.push({ ...g, ...r, ...classe });
      if (!asJson) {
        if (r.ok) {
          console.log(`ok  ${formata(r.ms)}`);
        } else if (classe.ambiente) {
          /* Não é verde e não é vermelho: o ambiente local não permite medir. */
          console.log(`NÃO MEDIDO  ${formata(r.ms)}`);
          console.log(`        ambiente: ${classe.motivo}`);
          console.log(`        evidência: ${classe.evidencia}`);
        } else if (r.estourou) {
          console.log(`ESTOUROU ${formata(r.ms)} (teto ${formata(TETO_MS)})`);
        } else {
          console.log(`FALHOU  ${formata(r.ms)}`);
          // Só o essencial do erro: o relatório não é o lugar do log inteiro.
          const linhas = r.saida
            .split('\n')
            .filter((l) => l.trim())
            .slice(-12);
          for (const l of linhas) console.log(`        ${l.slice(0, 150)}`);
        }
      }
    }
    resultados.push({ pacote: pacote.nome, dir: pacote.dir, itens });
  }

  /** Vermelho de verdade: falhou e NÃO é assinatura de ambiente. */
  const falhas = resultados.flatMap((r) =>
    r.itens.filter((i) => !i.ok && !i.ambiente).map((i) => `${r.pacote}:${i.nome}`),
  );
  /** Não medido: falhou, mas a causa é o ambiente local (o CI mede com o banco dele). */
  const naoMedidos = resultados.flatMap((r) =>
    r.itens.filter((i) => !i.ok && i.ambiente).map((i) => `${r.pacote}:${i.nome} (${i.motivo})`),
  );
  const semPortoes = resultados.filter((r) => r.semPortoes).map((r) => r.pacote);
  const avisos = naoCoberto(relevantes);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          arquivos: relevantes.length,
          pacotes: selecionados.map((p) => p.nome),
          portoes: resultados,
          falhas,
          naoMedidos,
          semPortoes,
          naoCoberto: avisos,
          veredito: falhas.length ? 'falhou' : naoMedidos.length ? 'parcial' : 'verde',
        },
        null,
        2,
      ),
    );
  } else {
    console.log('\n  ── O QUE NENHUM PORTÃO COBRE AQUI ─────────────────────────────');
    if (!avisos.length) {
      console.log('    (nada que mereça aviso para este escopo)');
    } else {
      for (const a of avisos) {
        console.log(`\n    ⚠ ${a.o}`);
        console.log(`      ${a.porque.replace(/(.{96})\s/g, '$1\n      ')}`);
        console.log(`      -> ${a.como}`);
      }
    }
    console.log('\n  ───────────────────────────────────────────────────────────────');

    if (falhas.length) {
      console.log(`  VERMELHO — ${falhas.length} portão(ões) falharam: ${falhas.join(', ')}`);
      console.log('  Não commite ainda. Portão verde é o piso, não a prova.\n');
    } else if (naoMedidos.length) {
      /* O veredito que a ferramenta aprendeu a dar. Antes disto ela dizia "VERMELHO" quando o
       problema era o Postgres da máquina — e vermelho falso ensina a ignorar vermelho. */
      console.log(
        `  PARCIAL — nada falhou, mas ${naoMedidos.length} portão(ões) NÃO puderam ser medidos aqui:`,
      );
      for (const n of naoMedidos) console.log(`    · ${n}`);
      if (semPortoes.length)
        console.log(`    (pacotes sem portão declarado: ${semPortoes.join(', ')})`);
      console.log(
        '  Não é verde: o ambiente local não permite afirmar que passou. O CI mede com o banco dele.',
      );
      console.log('  Leia os avisos acima antes de commitar.\n');
    } else {
      console.log('  VERDE — portões dos pacotes tocados passaram.');
      if (semPortoes.length)
        console.log(`  Sem portão declarado: ${semPortoes.join(', ')} (nada foi medido neles).`);
      console.log('  Leia os avisos acima: é ali que mora o que passou sem ser verificado.\n');
    }
  }

  process.exit(falhas.length ? 1 : 0);
}
