/**
 * T448b-2i — Dedupe de competições duplicadas: redirect reversível de referências + soft-delete
 * das duplicatas (qid NULL). Default DRY. `--apply` exige `--allow-production`.
 * Identidade canônica = QID; nunca por nome fuzzy. Nunca hard delete.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  selectCanonical,
  buildRedirectPlan,
  type CompetitionRow,
  type ReferenceCount,
  type ReferenceColumn,
  type ReferenceTable,
} from '../lib/identity/competition-dedupe.js';

const REASON = 'dedupe_t448b2i';
const DEFAULT_NAMES = 'Campeonato Brasileiro Série A,Copa do Brasil,Copa Libertadores da América';
/** Referências conhecidas a competitions.id (FKs + targetId não-FK do KG). */
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
  void column; // o KG conta targetId+sourceId juntos; coluna usada só no apply
  switch (table) {
    case 'rankings':
      return prisma.ranking.count({ where: { competitionId: id } });
    case 'matches':
      return prisma.match.count({ where: { competitionId: id } });
    case 'knowledge_graph':
      return (
        (await prisma.knowledgeGraph.count({ where: { targetId: id } })) +
        (await prisma.knowledgeGraph.count({ where: { sourceId: id } }))
      );
  }
}

async function applyRedirect(
  tx: Prisma.TransactionClient,
  table: ReferenceTable,
  column: ReferenceColumn,
  fromId: string,
  toId: string,
): Promise<number> {
  if (table === 'rankings') {
    return (
      await tx.ranking.updateMany({
        where: { competitionId: fromId },
        data: { competitionId: toId },
      })
    ).count;
  }
  if (table === 'matches') {
    return (
      await tx.match.updateMany({ where: { competitionId: fromId }, data: { competitionId: toId } })
    ).count;
  }
  if (column === 'sourceId') {
    return (
      await tx.knowledgeGraph.updateMany({ where: { sourceId: fromId }, data: { sourceId: toId } })
    ).count;
  }
  return (
    await tx.knowledgeGraph.updateMany({ where: { targetId: fromId }, data: { targetId: toId } })
  ).count;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const manifestOut = argVal('--manifest-out=');
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
    const redirects: Array<{
      table: string;
      column: string;
      fromId: string;
      toId: string;
      count: number;
    }> = [];
    const softDeleted: string[] = [];
    const errors: string[] = [];
    let duplicatesTotal = 0;
    let referencesTotal = 0;

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
      const dups: Array<Record<string, unknown>> = [];
      for (const d of sel.duplicates) {
        const refs: ReferenceCount[] = [];
        for (const r of REFS) {
          refs.push({
            table: r.table,
            column: r.column,
            count: await countRef(prisma, r.table, r.column, d.id),
          });
        }
        const plan = buildRedirectPlan(d, sel.canonicalId, sel.canonicalQid, refs);
        duplicatesTotal += 1;
        referencesTotal += plan.referencesTotal;
        dups.push({
          id: d.id,
          qid: d.qid,
          references: refs.filter((r) => r.count > 0),
          action: 'redirect_and_soft_delete',
        });
        for (const r of refs) {
          if (r.count > 0)
            redirects.push({
              table: r.table,
              column: r.column,
              fromId: d.id,
              toId: sel.canonicalId,
              count: r.count,
            });
        }
        softDeleted.push(d.id);
      }
      groups.push({
        name,
        canonicalId: sel.canonicalId,
        canonicalQid: sel.canonicalQid,
        duplicates: dups,
      });
    }

    const summary = {
      groups: groups.length,
      duplicates: duplicatesTotal,
      referencesToRedirect: referencesTotal,
      ambiguous: errors.length,
      errors: errors.length,
    };

    if (errors.length) {
      console.log(
        JSON.stringify({ mode: apply ? 'APPLY' : 'DRY', groups, totals: summary, errors }, null, 2),
      );
      process.exit(1);
    }
    if (!apply) {
      console.log(JSON.stringify({ mode: 'DRY', groups, totals: summary, errors: [] }, null, 2));
      return;
    }

    // APPLY — uma transação Serializable (all-or-nothing)
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
        for (const id of softDeleted) {
          const res = await tx.competition.updateMany({
            where: { id, qid: null, deletedAt: null },
            data: { deletedAt: new Date(), deletionReason: REASON },
          });
          if (res.count !== 1)
            throw new Error(`soft-delete rowcount != 1 (${id}) — rollback total`);
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const manifest = {
      generatedAt: new Date().toISOString(),
      reason: REASON,
      groups,
      redirects,
      softDeletedCompetitionIds: softDeleted,
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
