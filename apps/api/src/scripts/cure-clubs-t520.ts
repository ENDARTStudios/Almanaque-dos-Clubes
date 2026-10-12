/**
 * T520 — cura de identidade de clube (4 achados do T518/T519).
 *
 * Cada item roda em SUA PRÓPRIA transação e imprime antes/depois + o SQL de
 * rollback. Nada de hard-delete: onde houver duplicata, é soft-delete.
 *
 * Uso:
 *   node dist/scripts/cure-clubs-t520.js --item=audit        (READ-ONLY)
 *   node dist/scripts/cure-clubs-t520.js --item=gender --apply
 *   node dist/scripts/cure-clubs-t520.js --item=bragantino --apply
 *
 * Base das decisões (verificadas na fonte, não de memória — D-2026-10-09):
 *  - Q105973517 = "Cruzeiro Esporte Clube (female)", desc "clube brasileiro de
 *    futebol feminino" → a linha está com gender='men' e deve ser 'women';
 *  - Q5014111 = "Club de Regatas Vasco da Gama", desc "clube poliesportivo
 *    brasileiro", P641=futebol → é a entidade do time masculino do Rio, gravada
 *    como 'women';
 *  - Q2536715 = "Associação Chapecoense de Futebol", desc "clube de futebol
 *    brasileiro da cidade de Chapecó-SC" → clube (time masculino), gravado 'women';
 *    ATENÇÃO: Q2749819 (que um levantamento anterior citava como "Chapecoense
 *    masculino") é uma ESPÉCIE DE INSETO (Cneorane dohertyi) — nunca usar;
 *  - Q636709 ("Red Bull Bragantino II") ≠ Q541744 ("Red Bull Bragantino"): a
 *    classificação do Brasileirão (T508) gravou o time B no lugar do A.
 *
 * O que o item `audit` mostra e NÃO altera: o veredito de duplicata por QID
 * (zero) e as contagens de referência por clube — a base para decidir se algo
 * precisa migrar. Não há duplicata ativa: as famílias de nomes parecidos são
 * HOMÔNIMOS (QIDs e cidades distintas) e as duplicatas de seed já foram
 * soft-deletadas em 2026-09-26, sem referências.
 */
import { parseArgs } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');

/** Linhas cujo gender está comprovadamente errado (QID conferido na fonte). */
const GENDER_FIXES = [
  {
    qid: 'Q105973517',
    expectName: 'Cruzeiro Esporte Clube (female)',
    gender: 'women',
    why: 'Wikidata: "clube brasileiro de futebol feminino" (women\'s football team)',
  },
  {
    qid: 'Q5014111',
    expectName: 'Club de Regatas Vasco da Gama',
    gender: 'men',
    why: 'Wikidata: clube poliesportivo do Rio com P641=futebol — é a entidade do time masculino',
  },
  {
    qid: 'Q2536715',
    expectName: 'Associação Chapecoense de Futebol',
    gender: 'men',
    why: 'Wikidata: "clube de futebol brasileiro da cidade de Chapecó-SC" — clube, não time feminino',
  },
] as const;

/** Clubes cujo `country` pode estar nulo e é comprovadamente BR (P17). */
const COUNTRY_FIXES: Record<string, string> = {
  Q5014111: 'BR',
  Q2536715: 'BR',
};

const BR_SERIE_A_QID = 'Q206813';
const BRAGANTINO_QID = 'Q541744';
const BRAGANTINO_II_QID = 'Q636709';

interface StandingRow {
  clubId?: string | null;
  clubName?: string | null;
  matchedName?: string | null;
  [k: string]: unknown;
}

async function main(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      item: { type: 'string' },
      apply: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
  const item = values.item ?? '';
  const prisma = new PrismaClient();
  try {
    if (item === 'audit') return await audit(prisma);
    if (item === 'gender') return await fixGender(prisma);
    if (item === 'bragantino') return await fixBragantino(prisma);
    console.error('--item obrigatório: audit | gender | bragantino');
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

/** READ-ONLY: duplicata por QID (zero) + referências das famílias homônimas. */
async function audit(prisma: PrismaClient): Promise<number> {
  const dupQid = await prisma.$queryRaw<Array<{ qid: string; n: bigint }>>`
    SELECT qid, count(*) n FROM clubs WHERE qid IS NOT NULL GROUP BY qid HAVING count(*) > 1`;
  console.log(`[audit] QIDs duplicados: ${dupQid.length}`);

  const noQid = await prisma.club.count({ where: { qid: null, deletedAt: null } });
  const softDeleted = await prisma.club.count({ where: { deletedAt: { not: null } } });
  console.log(`[audit] clubes ativos sem QID: ${noQid} · soft-deleted: ${softDeleted}`);

  for (const fix of GENDER_FIXES) {
    const club = await prisma.club.findFirst({
      where: { qid: fix.qid },
      select: { id: true, name: true, gender: true, country: true, deletedAt: true },
    });
    if (!club) {
      console.log(`[audit] ${fix.qid}: AUSENTE no acervo`);
      continue;
    }
    const [partidas, grafo, ranking] = await Promise.all([
      prisma.match.count({ where: { OR: [{ homeClubId: club.id }, { awayClubId: club.id }] } }),
      prisma.knowledgeGraph.count({
        where: { OR: [{ sourceId: club.id }, { targetId: club.id }] },
      }),
      prisma.rankingEntry.count({ where: { clubId: club.id } }),
    ]);
    console.log(
      `[audit] ${fix.qid} ${club.id.slice(0, 8)} "${club.name}" gender=${club.gender} country=${club.country ?? 'null'} ` +
        `deleted=${club.deletedAt ? 'sim' : 'nao'} | partidas=${partidas} grafo=${grafo} ranking=${ranking} | esperado=${fix.gender} (${fix.why})`,
    );
  }

  // Bragantino: onde o time B foi gravado no lugar do A.
  const [real, second] = await Promise.all([
    prisma.club.findFirst({ where: { qid: BRAGANTINO_QID }, select: { id: true, name: true } }),
    prisma.club.findFirst({ where: { qid: BRAGANTINO_II_QID }, select: { id: true, name: true } }),
  ]);
  if (!real || !second) {
    console.log('[audit] Bragantino: não encontrei os dois clubes por QID');
    return 0;
  }
  console.log(
    `[audit] Bragantino A=${real.id.slice(0, 8)} "${real.name}" · B=${second.id.slice(0, 8)} "${second.name}"`,
  );
  const affected = await prisma.competitionSeason.findMany({
    where: { standings: { not: Prisma.DbNull } },
    select: { id: true, competitionId: true, season: true, standings: true },
  });
  let hits = 0;
  for (const cs of affected) {
    const rows = (cs.standings as unknown as StandingRow[] | null) ?? [];
    const bad = rows.filter((r) => r?.clubId === second.id);
    if (bad.length) {
      hits += bad.length;
      console.log(
        `[audit] ${cs.season}: ${bad.length} linha(s) apontando para o time B (match=${bad.map((b) => b.matchedName).join('/')})`,
      );
    }
  }
  console.log(`[audit] total de linhas de classificação apontando para o time B: ${hits}`);
  return 0;
}

/** Item 2 e 3: corrige o gender (e o country nulo) das três linhas comprovadas. */
async function fixGender(prisma: PrismaClient): Promise<number> {
  for (const fix of GENDER_FIXES) {
    const club = await prisma.club.findFirst({
      where: { qid: fix.qid },
      select: { id: true, name: true, gender: true, country: true },
    });
    if (!club) {
      console.log(`[gender] ${fix.qid}: AUSENTE — nada a fazer (gap declarado)`);
      continue;
    }
    // Trava de segurança: só mexe se o QID apontar para a linha esperada.
    if (club.name !== fix.expectName) {
      console.error(
        `[gender] ${fix.qid}: nome "${club.name}" ≠ esperado "${fix.expectName}" — ABORTADO`,
      );
      return 4;
    }
    const country = club.country ?? COUNTRY_FIXES[fix.qid] ?? null;
    if (club.gender === fix.gender && club.country === country) {
      console.log(`[gender] ${fix.qid} já correto (gender=${fix.gender})`);
      continue;
    }
    console.log(
      `[gender] ANTES  ${fix.qid} ${club.id.slice(0, 8)} "${club.name}" gender=${club.gender} country=${club.country ?? 'null'}`,
    );
    console.log(
      `[gender] ROLLBACK: UPDATE clubs SET gender='${club.gender}', country=${club.country ? `'${club.country}'` : 'NULL'} WHERE id='${club.id}';`,
    );
    if (APPLY) {
      await prisma.$transaction([
        prisma.club.update({
          where: { id: club.id },
          data: { gender: fix.gender, ...(country ? { country } : {}) },
        }),
      ]);
      const after = await prisma.club.findUnique({
        where: { id: club.id },
        select: { gender: true, country: true },
      });
      console.log(
        `[gender] DEPOIS ${fix.qid} gender=${after?.gender} country=${after?.country} (${fix.why})`,
      );
    } else {
      console.log('[gender] (dry-run — use --apply)');
    }
  }
  return 0;
}

/** Item 4: troca o time B pelo A dentro da classificação do Brasileirão (T508). */
async function fixBragantino(prisma: PrismaClient): Promise<number> {
  const comp = await prisma.competition.findFirst({
    where: { qid: BR_SERIE_A_QID },
    select: { id: true, name: true },
  });
  const real = await prisma.club.findFirst({
    where: { qid: BRAGANTINO_QID },
    select: { id: true, name: true },
  });
  const second = await prisma.club.findFirst({
    where: { qid: BRAGANTINO_II_QID },
    select: { id: true, name: true },
  });
  if (!comp || !real || !second) {
    console.log('[bragantino] competição ou clubes ausentes por QID — nada a fazer');
    return 0;
  }
  const seasons = await prisma.competitionSeason.findMany({
    where: { competitionId: comp.id },
    select: { id: true, season: true, standings: true },
  });
  let fixed = 0;
  for (const cs of seasons) {
    const rows = (cs.standings as unknown as StandingRow[] | null) ?? [];
    if (!rows.some((r) => r?.clubId === second.id)) continue;
    const next = rows.map((r) =>
      r?.clubId === second.id
        ? {
            ...r,
            clubId: real.id,
            matchedName: real.name,
            // marca a correção para auditoria (o clubName da wiki segue intacto)
            identityFix: `t520: ${second.name} -> ${real.name}`,
          }
        : r,
    );
    console.log(
      `[bragantino] ${cs.season}: ${rows.filter((r) => r.clubId === second.id).length} linha(s) ${second.name} -> ${real.name}`,
    );
    if (APPLY) {
      await prisma.$transaction([
        prisma.competitionSeason.update({
          where: { id: cs.id },
          data: { standings: next as unknown as Prisma.InputJsonValue },
        }),
      ]);
      fixed++;
    }
  }
  console.log(
    `[bragantino] temporadas corrigidas=${APPLY ? fixed : 0}${APPLY ? '' : ' (dry-run — use --apply)'}`,
  );
  return 0;
}

if (process.argv[1]?.includes('cure-clubs-t520')) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, '[t520] falha na cura de clubes');
      process.exit(1);
    });
}
