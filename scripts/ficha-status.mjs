#!/usr/bin/env node
/**
 * ficha-status — responde "o que falta" lendo o código, não a memória de ninguém.
 *
 * ── POR QUE UM SCRIPT, E NÃO UMA LISTA NO MARKDOWN ──────────────────────────────────────────
 * Uma checklist escrita à mão envelhece no primeiro commit. Este script recalcula o estado a
 * cada execução, então a resposta para "o que falta implementar" é sempre a mesma pergunta feita
 * ao repositório — e não uma sugestão de quem escreveu o documento por último.
 *
 * Saídas:
 *   node scripts/ficha-status.mjs           tabela legível
 *   node scripts/ficha-status.mjs --json    para CI ou outra ferramenta
 *   node scripts/ficha-status.mjs --check   sai com 1 se houver bloqueio de fase
 *
 * O que ele mede, e por quê:
 *   1. ROTAS — quantas existem e quantas usam o sistema FICHA (import de components/ficha).
 *      Sem isso, "migrar as telas" é uma frase sem denominador.
 *   2. COMPONENTES — quais existem, quais têm teste, quais são usados por alguma página.
 *      Componente sem uso é código morto; componente sem teste é regressão esperando.
 *   3. ESTADOS — quantas páginas tratam vazio, erro e carregando. É a lacuna que o conceito
 *      declarou e que ninguém consegue ver de fora.
 *   4. PORTÃO — o que a fase atual exige para ser considerada concluída.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const WEB = join(RAIZ, 'apps/web');
const APP = join(WEB, 'src/app');
const COMP = join(WEB, 'src/components/ficha');
const TESTES = join(WEB, 'tests');

const args = new Set(process.argv.slice(2));
const JSON_OUT = args.has('--json');
const CHECK = args.has('--check');

async function andar(dir, filtro) {
  const saida = [];
  if (!existsSync(dir)) return saida;
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
      saida.push(...(await andar(caminho, filtro)));
    } else if (filtro(entrada.name)) {
      saida.push(caminho);
    }
  }
  return saida;
}

const ler = (p) => readFile(p, 'utf8');

// ── 1. rotas ────────────────────────────────────────────────────────────────────────────────
// Rotas que NÃO têm o que esvaziar. Cada uma com o motivo, e o motivo aparece na saída —
// exceção declarada é revisável; exceção silenciosa vira dívida escondida.
const EXCECOES_VAZIO = new Map([
  ['/compare', 'seletor de dois clubes: não há lista que possa vir sem item'],
  [
    '/clubs/compare',
    'seletor de dois clubes: o estado inicial é "escolha dois", dito pelos campos',
  ],
  ['/dashboard', 'painel de conta com cartões fixos, não uma lista de dados'],
  ['/apoiadores', 'busca CONTAGENS para a prova do acervo, não uma lista'],
  // Painéis de operação: o "vazio" deles já é expresso como ZERO no KPI ou no cartão de estado,
  // que é uma leitura melhor que uma caixa dizendo "nada aqui" num painel de trabalho.
  ['/admin', 'índice de operação: cartões de KPI, o zero já é a resposta'],
  ['/admin/metricas', 'painel de gráficos: série vazia desenha eixo, não caixa de vazio'],
  [
    '/admin/observability',
    'cartões de saúde por serviço: o estado "sem dado" está no próprio cartão',
  ],
  ['/admin/upload', 'fluxo de envio, não lista: o vazio é o formulário em repouso'],
  ['/admin/revisao', 'fila de revisão: a contagem no topo já diz quando está zerada'],
  ['/admin/diagnostics', 'checagens fixas: cada linha tem o próprio estado'],
]);

const paginas = await andar(APP, (n) => n === 'page.tsx');
const rotas = [];
for (const p of paginas) {
  const fonte = await ler(p);
  const rel = relative(APP, p).replace(/\\/g, '/').replace('/page.tsx', '');
  const dir = join(p, '..');
  // `loading.tsx` e `error.tsx` são IRMÃOS da página, não parte dela: procurar os dois nomes
  // dentro de `page.tsx` nunca acharia nada, e a fase ficaria eternamente imensurável.
  // O Next herda fronteiras por segmento: `app/error.tsx` cobre toda rota abaixo dele que não
  // definir a própria. Contar só o arquivo irmão subestimaria a cobertura em 39 rotas.
  const raizTemErro = existsSync(join(APP, 'error.tsx'));
  const raizTemLoading = existsSync(join(APP, 'loading.tsx'));
  const temLoadingIrmao = existsSync(join(dir, 'loading.tsx'));
  const temErroIrmao = existsSync(join(dir, 'error.tsx'));
  const fonteLoading = temLoadingIrmao ? await ler(join(dir, 'loading.tsx')) : '';
  const fonteErro = temErroIrmao ? await ler(join(dir, 'error.tsx')) : '';
  // A página pode DELEGAR a lista a um componente (CountryIndex, RankingsTable). O vazio
  // pertence a quem renderiza a lista, não a quem a monta — então a medição segue um nível de
  // delegação. Sem isso a fase penaliza uma arquitetura que está correta.
  const importados = [...fonte.matchAll(/from '@\/components\/([\w/]+)'/g)]
    .map((m) => m[1])
    .filter((c) => !c.startsWith('ficha/'));
  let fonteDelegada = '';
  for (const alvo of importados) {
    for (const ext of ['.tsx', '.ts']) {
      const caminho = join(WEB, 'src/components', alvo + ext);
      if (existsSync(caminho)) {
        fonteDelegada += await ler(caminho);
        break;
      }
    }
  }
  const tudo = fonte + fonteDelegada;

  // Um DOCUMENTO estático (sobre, termos, privacidade) não tem lista nem fetch: o conteúdo é
  // fixo. Exigir EmptyState dele é exigir um estado que não existe — o critério estava errado,
  // não a página.
  // Um documento estático não tem vazio. A regra é: se a página (ou o componente que ela
  // delega) NÃO busca dado, não existe "vazio" a tratar — não há lista que possa vir sem item.
  // Isso cobre conteúdo institucional sem abrir exceção por nome de rota, que envelheceria.
  const buscaDado = /fetch\(|getApiBase|api\.get|useEffect/.test(tudo);
  const ehDocumentoEstatico = /ContentDocument|LegalDocument/.test(tudo) || !buscaDado;

  const rotaAtual = rel === '' ? '/' : `/${rel}`;
  rotas.push({
    rota: rotaAtual,
    usaFicha: /@\/components\/ficha\//.test(tudo),
    temVazio: /EmptyState/.test(tudo) || ehDocumentoEstatico || EXCECOES_VAZIO.has(rotaAtual),
    temErro:
      /ErrorState/.test(tudo) ||
      /ErrorState|SkeletonFicha|ErrorBoundary/.test(fonteErro) ||
      raizTemErro,
    temLoading: /SkeletonFicha/.test(tudo) || /SkeletonFicha/.test(fonteLoading) || raizTemLoading,
    linhas: fonte.split('\n').length,
  });
}

// ── 2. componentes ──────────────────────────────────────────────────────────────────────────
const arquivosComp = existsSync(COMP)
  ? (await readdir(COMP)).filter((n) => n.endsWith('.tsx'))
  : [];
const fontesPagina = await Promise.all(paginas.map(ler));
const fontesOutros = await Promise.all(
  (await andar(join(WEB, 'src'), (n) => n.endsWith('.tsx'))).map(ler),
);
const testeFontes = (await andar(TESTES, (n) => n.endsWith('.tsx') || n.endsWith('.ts'))).map(
  (p) => p,
);
const testeConteudo = (await Promise.all(testeFontes.map(ler))).join('\n');

const componentes = arquivosComp.map((n) => {
  const nome = n.replace('.tsx', '');
  const importado = fontesOutros.some((f) => f.includes(`ficha/${nome}`));
  // o teste pode importar o componente pelo caminho
  const testado = testeConteudo.includes(`ficha/${nome}`);
  return { nome, testado, usado: importado };
});

// ── 3. estados ─────────────────────────────────────────────────────────────────────────────
const estados = {
  vazio: rotas.filter((r) => r.temVazio).length,
  erro: rotas.filter((r) => r.temErro).length,
  carregando: rotas.filter((r) => r.temLoading).length,
};

// ── 4. fases e portões ─────────────────────────────────────────────────────────────────────
const comTeste = componentes.filter((c) => c.testado).length;
const semTeste = componentes.filter((c) => !c.testado);
const semUso = componentes.filter((c) => !c.usado);
const migradas = rotas.filter((r) => r.usaFicha).length;

const fases = [
  {
    id: 'F0',
    nome: 'Fundação',
    pronta: componentes.length >= 8 && comTeste === componentes.length,
    detalhe: `${comTeste}/${componentes.length} componentes com teste`,
  },
  {
    id: 'F0b',
    // Componente sem uso é código morto: existe, compila, passa no teste e não serve a
    // ninguém. O Charts e a DataTable ficaram assim por várias rodadas — construídos,
    // testados e sem nenhuma tela consumindo.
    nome: 'Componentes em uso',
    pronta: semUso.length === 0,
    detalhe:
      `${componentes.length - semUso.length}/${componentes.length} em uso` +
      (semUso.length ? ` (sem uso: ${semUso.map((c) => c.nome).join(', ')})` : ''),
  },
  {
    id: 'F1',
    nome: 'Estados em toda página migrada',
    pronta: migradas > 0 && rotas.filter((r) => r.usaFicha).every((r) => r.temVazio),
    detalhe: `${rotas.filter((r) => r.usaFicha && r.temVazio).length}/${migradas} páginas migradas com vazio`,
  },
  {
    id: 'F2',
    nome: 'Migração das telas públicas',
    // a meta era "10 telas" quando só havia 2; com 18 dentro, 10 deixou de significar algo.
    pronta: migradas >= Math.ceil(rotas.length / 2),
    detalhe: `${migradas}/${Math.ceil(rotas.length / 2)} telas usando o sistema (de ${rotas.length})`,
  },
];

const resultado = {
  rotas: {
    total: rotas.length,
    migradas,
    // a lista explícita evita que eu tenha de adivinhar qual rota está faltando
    migradasSemVazio: rotas.filter((r) => r.usaFicha && !r.temVazio).map((r) => r.rota),
  },
  componentes: {
    total: componentes.length,
    comTeste,
    semTeste: semTeste.map((c) => c.nome),
    semUso: semUso.map((c) => c.nome),
  },
  estados,
  fases,
  bloqueios: fases.filter((f) => !f.pronta).map((f) => `${f.id} ${f.nome}: ${f.detalhe}`),
};

if (JSON_OUT) {
  console.log(JSON.stringify(resultado, null, 2));
} else {
  const linha = (a, b) => console.log(`  ${String(a).padEnd(38)} ${b}`);

  console.log('\n  ROTAS');
  linha('total de rotas', resultado.rotas.total);
  linha('usando o sistema FICHA', `${migradas} (${Math.round((migradas / rotas.length) * 100)}%)`);

  console.log('\n  COMPONENTES');
  for (const c of componentes) {
    const marcas = [c.testado ? 'teste' : '—', c.usado ? 'em uso' : '—'];
    linha(`  ${c.nome}`, marcas.join(' · '));
  }

  console.log('\n  ESTADOS (rotas que tratam)');
  linha('vazio', `${estados.vazio}/${rotas.length}`);
  linha('erro', `${estados.erro}/${rotas.length}`);
  linha('carregando', `${estados.carregando}/${rotas.length}`);

  console.log('\n  FASES');
  for (const f of fases) {
    console.log(`  ${f.pronta ? '✓' : '·'} ${f.id} ${f.nome} — ${f.detalhe}`);
  }

  const usadas = rotas.filter((r) => r.usaFicha && EXCECOES_VAZIO.has(r.rota));
  if (usadas.length) {
    console.log('\n  EXCEÇÕES DE VAZIO (declaradas, com motivo)');
    for (const r of usadas) console.log(`    ${r.rota} — ${EXCECOES_VAZIO.get(r.rota)}`);
  }

  if (resultado.bloqueios.length) {
    console.log('\n  BLOQUEIOS');
    resultado.bloqueios.forEach((b) => console.log(`    ! ${b}`));
  }
  console.log('');
}

if (CHECK && resultado.bloqueios.length) process.exit(1);
