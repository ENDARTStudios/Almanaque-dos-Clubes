/**
 * T448b-2h — Resolução de duplicatas de identidade (soft, reversível).
 *
 * FASE 0 (read-only em produção, 2026-09-26) provou:
 *  - 9 clubes ativos sem qid ("Corinthians", "Santos"…) são DUPLICATAS internas
 *    de linhas canônicas com QID Wikidata ("S.C. Corinthians Paulista", "Santos F.C."…);
 *  - os 9 QIDs-alvo já estão ocupados 9/9 por linhas canônicas ATIVAS;
 *  - referências às duplicatas: 18 ranking_entries (Ranking CBF/CONMEBOL 2023),
 *    1 favorite, 0 em knowledge_graph/matches;
 *  - 0 colisões (canônico não ranqueado nos mesmos rankings) → redirect limpo.
 *
 * Plano (por entry do pack):
 *  1. redirect ranking_entries.clubId: dupId → canonId;
 *  2. redirect favorites.clubId: dupId → canonId;
 *  3. soft-delete da duplicata (deletedAt) — REVERSÍVEL (deletedAt null restaura);
 *     NUNCA hard delete; nunca renomear; homônimos intocados.
 *
 * Uso (produção, no container):
 *   node dist/scripts/t448b2h-dedupe-identity.js                          # DRY-RUN
 *   node dist/scripts/t448b2h-dedupe-identity.js --apply --allow-production
 * Reversão: o pack registra dupId↔canonId — restaurar = limpar deletedAt das
 * duplicatas (e re-redirect das referências pelo mapa inverso, se necessário).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const PackSchema = z.object({
  task: z.literal('T448b-2h'),
  retrievedAt: z.string(),
  mappings: z
    .array(
      z.object({
        name: z.string().min(1),
        dupId: z.string().uuid(),
        canonId: z.string().uuid(),
        canonName: z.string().min(1),
        qid: z.string().regex(/^Q\d+$/),
      }),
    )
    .min(1),
});

export interface DedupePlanEntry {
  name: string;
  dupId: string;
  canonId: string;
  canonName: string;
  qid: string;
  rankingEntries: number;
  favorites: number;
  /** Pré-condições que ABORTAM a entry (nunca aplica parcialmente sem sinalizar). */
  blockers: string[];
}

/**
 * Plano PURO: valida pré-condições por entry (canon existe/ativo, dup existe/ativo
 * sem qid). Blockers não abortam o run inteiro — a entry com blocker é PULADA e
 * reportada (decisão consciente: parcial segura > tudo-ou-nada cego).
 */
export function buildDedupePlan(
  pack: {
    mappings: Array<{
      name: string;
      dupId: string;
      canonId: string;
      canonName: string;
      qid: string;
    }>;
  },
  refs: Map<string, { rankingEntries: number; favorites: number }>,
  checks: Map<string, { dupOk: boolean; canonOk: boolean }>,
): { plan: DedupePlanEntry[]; skipped: DedupePlanEntry[] } {
  const plan: DedupePlanEntry[] = [];
  const skipped: DedupePlanEntry[] = [];
  for (const m of pack.mappings) {
    const r = refs.get(m.dupId) ?? { rankingEntries: 0, favorites: 0 };
    const c = checks.get(m.dupId) ?? { dupOk: false, canonOk: false };
    const entry: DedupePlanEntry = {
      ...m,
      rankingEntries: r.rankingEntries,
      favorites: r.favorites,
      blockers: [],
    };
    if (!c.dupOk) entry.blockers.push('dup ausente/inativa');
    if (!c.canonOk) entry.blockers.push('canon ausente/inativo');
    if (entry.blockers.length > 0) skipped.push(entry);
    else plan.push(entry);
  }
  return { plan, skipped };
}

async function main(): Promise<void> {
  const APPLY = process.argv.includes('--apply');
  const ALLOW_PRODUCTION = process.argv.includes('--allow-production');
  if (APPLY && !ALLOW_PRODUCTION) {
    throw new Error('--apply exige --allow-production (gate explícito de escrita em produção)');
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const pack = PackSchema.parse(
    JSON.parse(readFileSync(join(here, 'data', 't448b2h-dedupe-pack.json'), 'utf8')),
  );

  console.log(
    `T448b-2h — dedupe de identidade (${APPLY ? 'APPLY' : 'DRY-RUN'}) · pack ${pack.retrievedAt}`,
  );
  const prisma = new PrismaClient();

  // Pré-condições lidas AO VIVO (nunca confiar só no pack).
  const dupIds = pack.mappings.map((m) => m.dupId);
  const dupRows = await prisma.club.findMany({
    where: { id: { in: dupIds }, deletedAt: null, qid: null },
    select: { id: true, name: true },
  });
  const canonIds = pack.mappings.map((m) => m.canonId);
  const canonRows = await prisma.club.findMany({
    where: { id: { in: canonIds }, deletedAt: null },
    select: { id: true, name: true },
  });
  const checks = new Map<string, { dupOk: boolean; canonOk: boolean }>();
  for (const m of pack.mappings) {
    checks.set(m.dupId, {
      dupOk: dupRows.some((d) => d.id === m.dupId),
      canonOk: canonRows.some((c) => c.id === m.canonId),
    });
  }
  const refs = new Map<string, { rankingEntries: number; favorites: number }>();
  for (const m of pack.mappings) {
    refs.set(m.dupId, {
      rankingEntries: await prisma.rankingEntry.count({ where: { clubId: m.dupId } }),
      favorites: await prisma.favorite.count({ where: { clubId: m.dupId } }),
    });
  }

  const { plan, skipped } = buildDedupePlan(pack, refs, checks);
  for (const p of plan) {
    console.log(
      `  [OK] ${p.name} → ${p.canonName} (${p.qid}) · redirect: ${p.rankingEntries} entries, ${p.favorites} favorito(s)`,
    );
  }
  for (const p of skipped) {
    console.warn(`  [SKIP] ${p.name} → blockers: ${p.blockers.join('; ')}`);
  }
  const totalRefs = plan.reduce((acc, p) => acc + p.rankingEntries + p.favorites, 0);
  console.log(
    `plano: ${plan.length} entradas · ${totalRefs} referências a redirecionar · ${plan.length} soft-deletes · ${skipped.length} puladas`,
  );

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply --allow-production para aplicar.');
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      const re = await tx.rankingEntry.updateMany({
        where: { clubId: p.dupId },
        data: { clubId: p.canonId },
      });
      const fv = await tx.favorite.updateMany({
        where: { clubId: p.dupId },
        data: { clubId: p.canonId },
      });
      await tx.club.update({
        where: { id: p.dupId },
        data: { deletedAt: new Date() },
      });
      console.log(
        `  [APPLIED] ${p.name} → ${p.canonName} · entries: ${re.count} · favoritos: ${fv.count} · dup soft-deleted`,
      );
    }
  });

  // Verificação pós-apply (read-only, sempre).
  const restantes = await prisma.club.count({
    where: { deletedAt: null, qid: null, id: { in: dupIds } },
  });
  const softDeletados = await prisma.club.count({
    where: { deletedAt: { not: null }, id: { in: dupIds } },
  });
  const refsRestantes = await prisma.rankingEntry.count({ where: { clubId: { in: dupIds } } });
  console.log(
    `\npós-apply: duplicatas soft-deleted=${softDeletados}/${plan.length} · ativas sem qid restantes=${restantes} · refs em entries apontando p/ dup=${refsRestantes}`,
  );
  if (restantes > 0 || refsRestantes > 0) {
    throw new Error('verificação pós-apply falhou — investigar antes de seguir');
  }
  console.log('Reversão: limpar deletedAt das duplicatas (ids no pack) restaura o estado prévio.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('FALHA:', err instanceof Error ? err.message : err);
  process.exit(1);
});
