/**
 * T507 (parte 3) — RE-CLASSIFICAÇÃO de clubes cujo nome indica seleção
 * nacional (`national`) ou federação (`federation`), mas que ainda estão com
 * kind='club' (default histórico).
 *
 * Determinístico e idempotente: só toca linhas com kind='club' e nome que casa
 * o padrão; re-run = 0 linhas (noop).
 *
 * Uso:
 *   DRY-RUN (default):  node dist/scripts/reclassify-national-clubs.js
 *   APPLY:              ... --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { apply: { type: 'boolean', default: false } },
});
const APPLY_ON = values.apply || APPLY;

/** Padrões (case-insensitive) → kind. Ordem importa (federação antes de seleção). */
const PATTERNS: Array<{ match: RegExp; kind: 'federation' | 'national_team'; label: string }> = [
  {
    match: /\b(football association|federation|federação|asociación)\b/i,
    kind: 'federation',
    label: 'federação',
  },
  { match: /\bnational\b/i, kind: 'national_team', label: 'seleção' },
  { match: /\bsele(c|ç)(ã|a)o\b/i, kind: 'national_team', label: 'seleção (pt)' },
];

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const candidates = await prisma.club.findMany({
      where: { kind: 'club', deletedAt: null },
      select: { id: true, name: true },
    });

    const planned: Array<{ id: string; name: string; kind: string; label: string }> = [];
    for (const c of candidates) {
      for (const p of PATTERNS) {
        if (p.match.test(c.name)) {
          planned.push({ id: c.id, name: c.name, kind: p.kind, label: p.label });
          break; // primeiro padrão que casa vence
        }
      }
    }

    const byKind = planned.reduce<Record<string, number>>((acc, p) => {
      acc[p.kind] = (acc[p.kind] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `[t507-3] modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'} · candidatos=${planned.length} · ${JSON.stringify(byKind)}`,
    );
    for (const p of planned.slice(0, 6))
      console.log(`  amostra: ${p.name} → ${p.kind} (${p.label})`);

    if (!APPLY_ON) {
      console.log('[t507-3] DRY-RUN — nada gravado. Rode com --apply.');
      return 0;
    }

    let updated = 0;
    for (const p of planned) {
      await prisma.club.update({ where: { id: p.id }, data: { kind: p.kind } });
      updated += 1;
    }
    const counts = {
      national_team: await prisma.club.count({ where: { kind: 'national_team' } }),
      federation: await prisma.club.count({ where: { kind: 'federation' } }),
      club: await prisma.club.count({ where: { kind: 'club' } }),
    };
    console.log(`[t507-3] reclassificados=${updated} · totais=${JSON.stringify(counts)}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('reclassify-national-clubs')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t507-3] falha na reclassificação');
      process.exit(1);
    });
}
