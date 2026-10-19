/**
 * BOT A — Ingere as SUBDIVISÕES (estados/províncias) dos países que têm clubes no acervo.
 *
 * ── POR QUE ─────────────────────────────────────────────────────────────────────────────
 * A hierarquia Estado → Cidade pedida para Clubes e Jogadores não pode ser construída sobre o
 * que existe hoje: 114 linhas em `states` (23 do Brasil) para 220 países com clubes. A Austrália
 * tem 554 clubes e ZERO estados cadastrados; Grécia 404, Japão 359, Bélgica 281.
 *
 * Este bot popula `states` a partir do Wikidata (CC0), pela chave que o schema já declarou:
 * `code` = ISO 3166-2 (`BR-SP`), único, e `qid` também único.
 *
 * ── CONVENÇÕES QUE ELE SEGUE (as mesmas de `enrich-clubs-coordinates-m1a2.ts`) ───────────
 *   - DRY-RUN por padrão. Nada é escrito sem `--apply`.
 *   - `--apply` em produção exige `--allow-production` explícito.
 *   - NUNCA sobrescreve dado existente: só cria o que falta e preenche campo NULO
 *     (coordenada). Nome e código de estado já cadastrado são preservados — se o rótulo do
 *     Wikidata mudar, trocar silenciosamente reescreveria história de URL e de link interno.
 *   - Tudo que ele escreve leva `importedFrom`, `importedAt` e `sourceUrl`: dá para auditar e
 *     para reverter (`DELETE FROM states WHERE "importedFrom" = '...'`) sem adivinhar.
 *
 * ── USO ──────────────────────────────────────────────────────────────────────────────────
 *   node dist/scripts/ingest-states-wikidata.js                        # dry-run, top 40 países
 *   node dist/scripts/ingest-states-wikidata.js --top=120              # dry-run, top 120
 *   node dist/scripts/ingest-states-wikidata.js --paises=AU,GR,JP,BE   # países específicos
 *   node dist/scripts/ingest-states-wikidata.js --apply --allow-production
 *   node dist/scripts/ingest-states-wikidata.js --apply --allow-production --paises=AU
 *
 * Idempotente: rodar de novo cria 0 e não altera nada. `--limite` restringe quantos países
 * processar numa execução (para não pendurar o container num lote grande).
 */
import { PrismaClient } from '@prisma/client';
import { querySparql } from '../lib/wikidata/sparql-client.js';
import { montarQuery, normalizarEstados } from '../lib/wikidata/extract-states.js';

const IMPORTED_FROM = 'wikidata-sparql-estados';

function argNum(nome: string, padrao: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
  const n = a ? Number.parseInt(a.slice(nome.length + 3), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

function argLista(nome: string): string[] {
  const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
  if (!a) return [];
  return a
    .slice(nome.length + 3)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

interface Plano {
  iso2: string;
  countryId: string;
  clubes: number;
  estados: number;
  criados: number;
  preenchidos: number;
  descartados: Record<string, number>;
  erro?: string;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const top = argNum('top', 40);
  const limitePaises = argNum('limite', 0);
  const paisesPedidos = argLista('paises');

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
    /* Países-alvo: os que TÊM clubes, ordenados por quantidade. Ingerir estado de país sem
       clube gastaria requisição e encheria a tabela de linha que ninguém consulta. */
    const comClubes = await prisma.$queryRaw<
      Array<{ id: string; iso2: string; qid: string | null; clubes: bigint; estados: bigint }>
    >`
      SELECT c.id, c.iso2, c.qid, count(cl.id) AS clubes,
             (SELECT count(*) FROM states s WHERE s."countryId" = c.id) AS estados
      FROM countries c
      JOIN clubs cl ON cl.country = c.iso2
      GROUP BY c.id, c.iso2, c.qid
      ORDER BY count(cl.id) DESC
    `;

    let alvos = comClubes.map((r) => ({
      id: r.id,
      iso2: r.iso2,
      clubes: Number(r.clubes),
      estados: Number(r.estados),
    }));

    if (paisesPedidos.length) {
      alvos = alvos.filter((a) => paisesPedidos.includes(a.iso2));
      const achados = new Set(alvos.map((a) => a.iso2));
      const faltando = paisesPedidos.filter((p) => !achados.has(p));
      if (faltando.length) {
        console.warn(`AVISO: países sem clube no acervo, ignorados: ${faltando.join(', ')}`);
      }
    } else {
      alvos = alvos.slice(0, top);
    }
    if (limitePaises) alvos = alvos.slice(0, limitePaises);

    console.log(
      `\nBOT A — estados do Wikidata · ${apply ? 'APLICANDO' : 'DRY-RUN'} · ${alvos.length} país(es)\n`,
    );

    const planos: Plano[] = [];
    for (const pais of alvos) {
      const plano: Plano = {
        iso2: pais.iso2,
        countryId: pais.id,
        clubes: pais.clubes,
        estados: pais.estados,
        criados: 0,
        preenchidos: 0,
        descartados: {},
      };

      try {
        const bindings = await querySparql(montarQuery(pais.iso2));
        const { estados, descartados } = normalizarEstados(bindings, pais.iso2);
        plano.descartados = descartados;

        for (const e of estados) {
          /* Localiza por qid OU code: o schema tem os dois como únicos, e um estado pode ter
             entrado antes com qid nulo (ou com o qid e sem o código). Consultar os dois evita
             violar a constraint na criação. */
          const existente = await prisma.state.findFirst({
            where: { OR: [{ qid: e.qid }, { code: e.code }] },
            select: { id: true, latitude: true, longitude: true },
          });

          if (!existente) {
            plano.criados++;
            if (apply) {
              await prisma.state.create({
                data: {
                  code: e.code,
                  name: e.name,
                  countryId: pais.id,
                  qid: e.qid,
                  latitude: e.latitude,
                  longitude: e.longitude,
                  sourceUrl: e.sourceUrl,
                  importedFrom: IMPORTED_FROM,
                  importedAt: new Date(),
                },
              });
            }
            continue;
          }

          /* Já existe: só preenche coordenada NULA. Nome, código e qid não são tocados. */
          const precisaCoord =
            (existente.latitude === null && e.latitude !== null) ||
            (existente.longitude === null && e.longitude !== null);
          if (precisaCoord) {
            plano.preenchidos++;
            if (apply) {
              await prisma.state.update({
                where: { id: existente.id },
                data: {
                  latitude: existente.latitude ?? e.latitude,
                  longitude: existente.longitude ?? e.longitude,
                },
              });
            }
          }
        }
      } catch (err) {
        /* Um país que falha NÃO vira "não tem estados": o erro é registrado e o processo segue.
           Gravar ausência de resposta como ausência de dado é o defeito que este cuidado evita. */
        plano.erro = err instanceof Error ? err.message : String(err);
      }

      planos.push(plano);
      const rotulo = plano.erro
        ? `ERRO: ${plano.erro.slice(0, 60)}`
        : `+${plano.criados} novo(s), ${plano.preenchidos} coord.`;
      console.log(
        `  ${pais.iso2}  ${String(pais.clubes).padStart(5)} clube(s) · ${String(pais.estados).padStart(3)} estado(s) hoje -> ${rotulo}`,
      );
    }

    const totalCriados = planos.reduce((s, p) => s + p.criados, 0);
    const totalPreenchidos = planos.reduce((s, p) => s + p.preenchidos, 0);
    const comErro = planos.filter((p) => p.erro);
    const descartesMapa = new Map<string, number>();
    for (const p of planos) {
      for (const [k, v] of Object.entries(p.descartados)) {
        descartesMapa.set(k, (descartesMapa.get(k) ?? 0) + v);
      }
    }
    const descartes = Object.fromEntries(descartesMapa);

    console.log('\n  ── resumo ─────────────────────────────────────────────');
    console.log(`  estados novos .......... ${totalCriados}`);
    console.log(`  coordenadas preenchidas  ${totalPreenchidos}`);
    console.log(
      `  países com erro ........ ${comErro.length}${comErro.length ? ` (${comErro.map((p) => p.iso2).join(', ')})` : ''}`,
    );
    if (Object.keys(descartes).length) {
      console.log(`  descartes .............. ${JSON.stringify(descartes)}`);
    }
    if (!apply) {
      console.log('\n  DRY-RUN: nada foi escrito. Repita com --apply --allow-production.');
    } else {
      console.log(
        '\n  APLICADO. Rollback: DELETE FROM states WHERE "importedFrom" = \'wikidata-sparql-estados\';',
      );
    }

    // Erro de país é falha do lote: sair 1 faz o CI/operador notar, em vez de "deu tudo certo".
    if (comErro.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /ingest-states-wikidata\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
