/**
 * BOT B — Liga os clubes ao seu ESTADO, caminhando o `P131` do Wikidata.
 *
 * ── POR QUE ─────────────────────────────────────────────────────────────────────────────
 * O bot A (T588) encheu `states`: 114 -> 2.449 linhas, 68 países. Mas os CLUBES continuam sem
 * estado ligado. Medido antes de escrever:
 *
 *   clubes com `stateId` nulo em país que JÁ tem estado ... 9.496
 *     desses, com `qid` ................................... 9.445
 *   clubes em país SEM estado (fora do escopo aqui) ........ 1.087
 *
 * Sem `Club.stateId` não existe hierarquia Estado → Cidade para mostrar: a tela teria a lista de
 * estados bonita e vazia embaixo de cada um.
 *
 * ── COMO LIGA ───────────────────────────────────────────────────────────────────────────
 * O estado não vem no clube: vem subindo a cadeia administrativa
 * (`clube --P131--> município --P131--> estado`). A busca é em largura, nível a nível, sobre o
 * conjunto todo — a lógica vive em `lib/wikidata/resolve-state.ts`, com o porquê de cada decisão.
 *
 * ── PROVENIÊNCIA E ROLLBACK — decisão explícita ─────────────────────────────────────────
 * `Club.importedFrom` NÃO é tocado. Ele registra de onde o CLUBE veio ("wikidata", "rsssf"),
 * e sobrescrevê-lo para marcar esta operação destruiria a proveniência original de 9 mil linhas
 * para registrar uma informação que não é dela. `Club` também não tem coluna de metadado
 * geográfico, e criar uma exigiria migração que este bot não precisa.
 *
 * No lugar disso, o bot grava um RELATÓRIO com `clubeId -> stateId` (e emite no stdout quando não
 * há `--relatorio`). O rollback é o inverso exato do relatório:
 *
 *   UPDATE clubs SET "stateId" = NULL WHERE id IN ('…','…');
 *
 * Isso é mais honesto do que um marcador genérico: permite desfazer SÓ o que este bot fez, sem
 * adivinhar, e sem apagar o que já existia antes dele.
 *
 * ── USO ──────────────────────────────────────────────────────────────────────────────────
 *   node dist/scripts/link-clubs-state.js                          # dry-run, sem limite
 *   node dist/scripts/link-clubs-state.js --limite=200             # dry-run, amostra
 *   node dist/scripts/link-clubs-state.js --apply --allow-production --relatorio=/tmp/b.json
 *
 * Idempotente por construção: só considera clube com `stateId` NULO, então o que já foi ligado
 * nunca é reprocessado nem sobrescrito.
 */
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { fetchEntities } from '../lib/wikidata/wikidata-client.js';
import { resolverClubesParaEstados, PROFUNDIDADE_MAX } from '../lib/wikidata/resolve-state.js';

function argNum(nome: string, padrao: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
  const n = a ? Number.parseInt(a.slice(nome.length + 3), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

function argTexto(nome: string): string | null {
  const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const limite = argNum('limite', 0);
  const profundidade = argNum('profundidade', PROFUNDIDADE_MAX);
  const relatorio = argTexto('relatorio');

  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    /* Mapa QID -> id do estado. Só os que TÊM qid: sem ele não há como casar com o Wikidata. */
    const estados = await prisma.state.findMany({
      where: { qid: { not: null } },
      select: { id: true, qid: true },
    });
    const estadosPorQid = new Map<string, string>();
    for (const e of estados) if (e.qid) estadosPorQid.set(e.qid, e.id);

    if (estadosPorQid.size === 0) {
      console.error('BLOQUEADO: nenhum estado com qid — rode o bot A primeiro.');
      process.exit(1);
    }

    /* Países que JÁ têm estado cadastrado — pelo código ISO2 (string), e NÃO pela relação
       `countryRef`.
       Motivo medido: `Club.countryId` (a FK) está preenchido em só ~32% dos clubes, enquanto
       `Club.country` (a string ISO2) está em ~99%. Filtrar por `countryRef` fazia o bot enxergar
       2.960 clubes quando o alvo real era 9.445 — descartava dois terços do trabalho sem avisar,
       e o total processado parecia "o universo" quando era um terço dele. */
    const paisesComEstado = await prisma.country.findMany({
      where: { states: { some: {} } },
      select: { iso2: true },
    });
    const codigosComEstado = paisesComEstado.map((c) => c.iso2);
    if (codigosComEstado.length === 0) {
      console.error('BLOQUEADO: nenhum país com estado — rode o bot A primeiro.');
      process.exit(1);
    }

    const candidatos = await prisma.club.findMany({
      where: {
        deletedAt: null,
        stateId: null,
        qid: { not: null },
        country: { in: codigosComEstado },
      },
      select: { id: true, qid: true, name: true, country: true },
      orderBy: { id: 'asc' },
    });
    const alvos = (limite ? candidatos.slice(0, limite) : candidatos).map((c) => ({
      id: c.id,
      qid: c.qid as string,
    }));

    console.log(
      `\nBOT B — clubes -> estados · ${apply ? 'APLICANDO' : 'DRY-RUN'} · ${alvos.length} clube(s) · profundidade ${profundidade}\n`,
    );
    console.log(`  estados com qid no mapa: ${estadosPorQid.size}`);

    const t0 = Date.now();
    const r = await resolverClubesParaEstados(alvos, {
      estadosPorQid,
      buscar: (qids) => fetchEntities(qids),
      profundidadeMax: profundidade,
    });

    const segundos = Math.round((Date.now() - t0) / 1000);
    const taxa = alvos.length ? Math.round((r.resolvidos.size / alvos.length) * 100) : 0;

    console.log('\n  ── resolução por profundidade ───────────────────────────');
    r.porProfundidade.forEach((n, nivel) => {
      console.log(`    nível ${nivel}: ${String(n).padStart(5)} clube(s) resolvido(s)`);
    });
    console.log('\n  ── resumo ───────────────────────────────────────────────');
    console.log(`  resolvidos ......... ${r.resolvidos.size} de ${alvos.length}  (${taxa}%)`);
    console.log(`  não resolvidos ..... ${r.naoResolvidos.length}`);
    console.log(`  tempo .............. ${segundos}s`);

    /* Relatório: é a única forma de desfazer SÓ o que este bot fez. Gravado mesmo em dry-run,
       para o operador poder inspecionar antes de aplicar. */
    const mapa = Object.fromEntries(
      [...r.resolvidos].map(([clubeId, v]) => [
        clubeId,
        { stateId: v.stateId, profundidade: v.profundidade },
      ]),
    );
    const destino = relatorio ?? '/tmp/link-clubs-state.json';
    try {
      /* eslint-disable-next-line security/detect-non-literal-fs-filename --
         o caminho vem de `--relatorio=` na linha de comando do OPERADOR, num script de
         manutenção que roda no container. Não há entrada de usuário da aplicação por perto: o
         valor é digitado junto com o comando, como qualquer outro argumento de CLI. */
      writeFileSync(
        destino,
        JSON.stringify({ geradoEm: new Date().toISOString(), apply, mapa }, null, 2),
      );
      console.log(`  relatório .......... ${destino}`);
    } catch (err) {
      console.warn(
        `  AVISO: não foi possível gravar o relatório (${err instanceof Error ? err.message : err})`,
      );
      console.warn('  Os ids resolvidos estão no stdout abaixo, para rollback manual.');
      console.log(JSON.stringify(mapa));
    }

    if (!apply) {
      console.log('\n  DRY-RUN: nada foi escrito. Repita com --apply --allow-production.');
      return;
    }

    /* Escrita em lotes: 9 mil UPDATEs individuais seriam lentos e, se o processo cair no meio,
       deixariam o serviço num estado parcial sem registro do ponto. Agrupando por stateId, cada
       lote é um updateMany — e o relatório diz exatamente o que entrou. */
    const porEstado = new Map<string, string[]>();
    for (const [clubeId, v] of r.resolvidos) {
      if (!porEstado.has(v.stateId)) porEstado.set(v.stateId, []);
      porEstado.get(v.stateId)!.push(clubeId);
    }
    let escritos = 0;
    for (const [stateId, ids] of porEstado) {
      const res = await prisma.club.updateMany({
        where: { id: { in: ids }, stateId: null },
        data: { stateId },
      });
      escritos += res.count;
    }
    console.log(`\n  APLICADO: ${escritos} clube(s) ligados a ${porEstado.size} estado(s).`);
    console.log('  Rollback: UPDATE clubs SET "stateId" = NULL WHERE id IN (ids do relatório);');
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /link-clubs-state\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
