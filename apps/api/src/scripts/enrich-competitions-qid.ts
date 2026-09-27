/**
 * WS-D M1a — Atribui QID às 3 competições brasileiras sem identidade. Default DRY.
 * Mapeamento VALIDADO manualmente (arquivo versionado). `--apply` exige `--allow-production`.
 * Não cria/apaga competições; só preenche `qid` quando NULL.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import mapping from '../lib/wikidata/data/competitions-qid-mapping.json' with { type: 'json' };

const IMPORTED_FROM = 'wikidata-enrich-v1';

interface MappingItem {
  name: string;
  qid: string;
  label: string;
}
const ITEMS = (mapping as { items: MappingItem[] }).items;

function argVal(prefix: string): string | null {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }
  void argVal; // reservado

  const prisma = new PrismaClient();
  try {
    const report: Array<{ name: string; qid: string; action: string; competitionId?: string }> = [];
    const plan: Array<{ id: string; qid: string }> = [];
    const errors: string[] = [];

    for (const item of ITEMS) {
      const comps = await prisma.competition.findMany({
        where: { name: item.name, qid: null },
        select: { id: true, name: true },
      });
      if (comps.length === 0) {
        report.push({ name: item.name, qid: item.qid, action: 'noop_or_absent' });
        continue;
      }
      if (comps.length > 1) {
        errors.push(`ambiguous_competition:${item.name}`);
        continue;
      }
      const occupied = await prisma.competition.count({ where: { qid: item.qid } });
      if (occupied > 0) {
        errors.push(`qid_already_exists:${item.qid}`);
        report.push({ name: item.name, qid: item.qid, action: 'qid_already_exists' });
        continue;
      }
      plan.push({ id: comps[0].id, qid: item.qid });
      report.push({ name: item.name, qid: item.qid, action: 'update', competitionId: comps[0].id });
    }

    if (!apply) {
      console.log(
        JSON.stringify(
          { mode: 'DRY', mapped: ITEMS.length, wouldUpdate: plan.length, report, errors },
          null,
          2,
        ),
      );
      return;
    }
    if (errors.length) {
      console.log(JSON.stringify({ mode: 'APPLY', errors }, null, 2));
      process.exit(1);
    }

    let updated = 0;
    await prisma.$transaction(
      async (tx) => {
        for (const p of plan) {
          const res = await tx.competition.updateMany({
            where: { id: p.id, qid: null },
            data: { qid: p.qid, importedFrom: IMPORTED_FROM },
          });
          if (res.count !== 1) throw new Error(`rowcount != 1 (${p.id})`);
          updated += 1;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    console.log(
      JSON.stringify({ mode: 'APPLY', updated, errors: 0, hardDeletes: 0, migrations: 0 }, null, 2),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/enrich-competitions-qid\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
