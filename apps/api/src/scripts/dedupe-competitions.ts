/**
 * T448b-2i — Dedupe de competições. Duas vias:
 *  (1) por NOME EXATO (grupos não ambíguos; canônica por QID);
 *  (2) por PAR HUMANO explícito versionado (`--pairs-only` / `--pairs-file`), para divergência de nome.
 * Default DRY. `--apply` exige `--allow-production`. Nunca hard delete; redirect reversível + manifest.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import pairsRaw from '../lib/identity/data/competition-dedupe-human-pairs-v1.json' with { type: 'json' };
import {
  selectCanonical,
  buildRedirectPlan,
  validatePairsFile,
  validateHumanPair,
  type CompetitionRow,
  type HumanPair,
  type ReferenceCount,
  type ReferenceColumn,
  type ReferenceTable,
} from '../lib/identity/competition-dedupe.js';

const REASON = 'dedupe_t448b2i';
const REASON_PAIR = 'dedupe_t448b2i_human_pair';
const DEFAULT_NAMES = 'Campeonato Brasileiro Série A,Copa do Brasil,Copa Libertadores da América';
const REFS: Array<{ table: ReferenceTable; column: ReferenceColumn }> = [
  { table: 'rankings', column: 'competitionId' },
  { table: 'matches', column: 'competitionId' },
  { table: 'knowledge_graph', column: 'targetId' },
];

function argVal(prefix: string): string | null {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : null;
}

async function countRef(
  prisma: PrismaClient,
  table: ReferenceTable,
  column: ReferenceColumn,
  id: string,
): Promise<number> {
  void column;
  if (table === 'rankings') return prisma.ranking.count({ where: { competitionId: id } });
  if (table === 'matches') return prisma.match.count({ where: { competitionId: id } });
  return (
    (await prisma.knowledgeGraph.count({ where: { targetId: id } })) +
    (await prisma.knowledgeGraph.count({ where: { sourceId: id } }))
  );
}

async function applyRedirect(
  tx: Prisma.TransactionClient,
  table: ReferenceTable,
  column: ReferenceColumn,
  fromId: string,
  toId: string,
): Promise<number> {
  if (table === 'rankings')
    return (
      await tx.ranking.updateMany({
        where: { competitionId: fromId },
        data: { competitionId: toId },
      })
    ).count;
  if (table === 'matches')
    return (
      await tx.match.updateMany({ where: { competitionId: fromId }, data: { competitionId: toId } })
    ).count;
  if (column === 'sourceId')
    return (
      await tx.knowledgeGraph.updateMany({ where: { sourceId: fromId }, data: { sourceId: toId } })
    ).count;
  return (
    await tx.knowledgeGraph.updateMany({ where: { targetId: fromId }, data: { targetId: toId } })
  ).count;
}

interface RedirectRow {
  table: string;
  column: string;
  fromId: string;
  toId: string;
  count: number;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const pairsOnly = process.argv.includes('--pairs-only');
  const manifestOut = argVal('--manifest-out=');
  const pairsFile = argVal('--pairs-file=');
  const names = (argVal('--names=') ?? DEFAULT_NAMES).split(',').map((s) => s.trim());
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
    const groups: Array<Record<string, unknown>> = [];
    const redirects: RedirectRow[] = [];
    const softDeleted: Array<{ id: string; reason: string }> = [];
    const errors: string[] = [];
    let duplicatesTotal = 0;
    let referencesTotal = 0;
    let groupsByName = 0;

    // ---- via 1: NOME EXATO ----
    if (!pairsOnly) {
      for (const name of names) {
        const rows = (await prisma.competition.findMany({
          where: { name },
          select: { id: true, name: true, qid: true, deletedAt: true },
        })) as CompetitionRow[];
        if (rows.filter((r) => r.deletedAt == null).length <= 1) continue;
        const sel = selectCanonical(rows);
        if (sel.status !== 'ok' || !sel.canonicalId || !sel.canonicalQid) {
          errors.push(`${sel.status}:${name}`);
          continue;
        }
        groupsByName += 1;
        const dups: Array<Record<string, unknown>> = [];
        for (const d of sel.duplicates) {
          const refs: ReferenceCount[] = [];
          for (const r of REFS)
            refs.push({
              table: r.table,
              column: r.column,
              count: await countRef(prisma, r.table, r.column, d.id),
            });
          duplicatesTotal += 1;
          referencesTotal += refs.reduce((a, r) => a + r.count, 0);
          dups.push({
            id: d.id,
            qid: d.qid,
            references: refs.filter((r) => r.count > 0),
            action: 'redirect_and_soft_delete',
          });
          for (const r of refs)
            if (r.count > 0)
              redirects.push({
                table: r.table,
                column: r.column,
                fromId: d.id,
                toId: sel.canonicalId,
                count: r.count,
              });
          softDeleted.push({ id: d.id, reason: REASON });
        }
        groups.push({
          name,
          canonicalId: sel.canonicalId,
          canonicalQid: sel.canonicalQid,
          duplicates: dups,
        });
      }
    }

    // ---- via 2: PAR HUMANO EXPLÍCITO ----
    let groupsByHumanPair = 0;
    const pairsOut: Array<Record<string, unknown>> = [];
    const raw = pairsFile
      ? (JSON.parse(readFileSync(pairsFile, 'utf8')) as unknown)
      : (pairsRaw as unknown);
    const { errors: pErrors, file } = validatePairsFile(raw);
    errors.push(...pErrors);
    if (file) {
      for (const pair of file.pairs as HumanPair[]) {
        const dup = (await prisma.competition.findUnique({
          where: { id: pair.duplicateId },
          select: { id: true, name: true, qid: true, deletedAt: true },
        })) as CompetitionRow | null;
        const canon = (await prisma.competition.findUnique({
          where: { id: pair.canonicalId },
          select: { id: true, name: true, qid: true, deletedAt: true },
        })) as CompetitionRow | null;
        const status = validateHumanPair(pair, dup, canon);
        if (status !== 'ok' || !dup || !canon) {
          errors.push(`${status}:${pair.duplicateId}`);
          continue;
        }
        const refs: ReferenceCount[] = [];
        for (const r of REFS)
          refs.push({
            table: r.table,
            column: r.column,
            count: await countRef(prisma, r.table, r.column, dup.id),
          });
        const plan = buildRedirectPlan(dup, canon.id, pair.canonicalQid, refs);
        groupsByHumanPair += 1;
        duplicatesTotal += 1;
        referencesTotal += plan.referencesTotal;
        pairsOut.push({
          duplicateId: dup.id,
          canonicalId: canon.id,
          canonicalQid: pair.canonicalQid,
          duplicateName: dup.name,
          canonicalName: canon.name,
          references: refs.filter((r) => r.count > 0),
          action: 'redirect_and_soft_delete',
        });
        for (const r of refs)
          if (r.count > 0)
            redirects.push({
              table: r.table,
              column: r.column,
              fromId: dup.id,
              toId: canon.id,
              count: r.count,
            });
        softDeleted.push({ id: dup.id, reason: REASON_PAIR });
      }
    }

    const totals = {
      groups: groups.length + pairsOut.length,
      groupsByName,
      groupsByHumanPair,
      duplicates: duplicatesTotal,
      referencesToRedirect: referencesTotal,
      ambiguous: errors.length,
      errors: errors.length,
    };

    if (errors.length) {
      console.log(
        JSON.stringify(
          { mode: apply ? 'APPLY' : 'DRY', groups, pairs: pairsOut, totals, errors },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    if (!apply) {
      console.log(
        JSON.stringify({ mode: 'DRY', groups, pairs: pairsOut, totals, errors: [] }, null, 2),
      );
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        for (const rd of redirects) {
          const n = await applyRedirect(
            tx,
            rd.table as ReferenceTable,
            rd.column as ReferenceColumn,
            rd.fromId,
            rd.toId,
          );
          if (n !== rd.count)
            throw new Error(
              `rowcount ${n} != ${rd.count} (${rd.table}.${rd.column}) — rollback total`,
            );
        }
        for (const s of softDeleted) {
          const res = await tx.competition.updateMany({
            where: { id: s.id, qid: null, deletedAt: null },
            data: { deletedAt: new Date(), deletionReason: s.reason },
          });
          if (res.count !== 1)
            throw new Error(`soft-delete rowcount != 1 (${s.id}) — rollback total`);
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const manifest = {
      version: 't448b2i-manifest-v1',
      generatedAt: new Date().toISOString(),
      groups,
      pairs: pairsOut,
      redirects,
      softDeleted,
    };
    if (manifestOut) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(manifestOut, JSON.stringify(manifest, null, 2));
    }
    console.log(
      JSON.stringify(
        {
          mode: 'APPLY',
          duplicatesSoftDeleted: softDeleted.length,
          referencesRedirected: redirects.reduce((a, r) => a + r.count, 0),
          errors: 0,
          hardDeletes: 0,
          migrations: 0,
          manifestPath: manifestOut ?? null,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/dedupe-competitions\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
