/**
 * T598/DQ-02 — CURA dos títulos publicados com competição errada (issue #753).
 *
 * ── O QUE ESTE SCRIPT FAZ (e por quê) ────────────────────────────────────────────
 * 1. REMOVE as arestas WON das edições Q3078393 (World Football Challenge 2012) e
 *    Q2597577 (2011). O item Wikidata dessas edições tem P3450 apontando para a
 *    Major League Soccer — dado INCORRETO na fonte: o World Football Challenge era
 *    um torneio amistoso de verão, não a liga americana. Sem a correção, a ficha do
 *    Real Madrid publicava "campeão da MLS" (hierarquia 'nacional'). A aresta é
 *    removida (não re-apontada) porque a mãe verdadeira no Wikidata está errada —
 *    re-apontar seria sobrescrever a fonte com modelagem nossa; curadoria decide
 *    depois se o amistoso entra com entidade própria.
 * 2. RENOMEIA a competição Q493331 ("Copa de la Queens") → "Copa de la Liga". O
 *    rótulo EN do item está vandalizado no Wikidata (o rótulo PT, "Copa da Liga
 *    Espanhola", está correto; a edição Q3692740 é a "1985 Copa de la Liga").
 * 3. RE-CLASSIFICA as arestas WON da Intercontinental Cup (Q182473) de
 *    hierarchy 'nacional' → 'mundial' (o mapa por QID no código já resolve para
 *    novas ingestões; este passo corrige o metadata CONGELADO das arestas vivas).
 *
 * ── SEGURANÇA ─────────────────────────────────────────────────────────────────────
 * DRY-RUN por default; --apply exige --allow-production em produção. Idempotente
 * (re-run = noop). Cada remoção é reportada com a linha completa para permitir
 * reversão manual; nada é gravado sem estar no relatório.
 *
 *   node dist/scripts/cure-titles-dq02.js                     # dry-run
 *   node dist/scripts/cure-titles-dq02.js --apply --allow-production
 */
import { PrismaClient } from '@prisma/client';

const EDICOES_WFC = ['Q3078393', 'Q2597577']; // World Football Challenge 2011/2012
const QID_COPA_DE_LA_LIGA = 'Q493331';
const NOME_CORRETO_COPA_DE_LA_LIGA = 'Copa de la Liga';
const QID_INTERCONTINENTAL = 'Q182473';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');

  if (!(process.env.DATABASE_URL ?? '').startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    console.log(`\nCURA DQ-02 · ${apply ? 'APLICANDO' : 'DRY-RUN'}`);

    // ── 1. Remove arestas WON das edições do World Football Challenge ─────────
    const wfcRows = await prisma.knowledgeGraph.findMany({
      where: {
        relation: 'WON',
        metadata: { path: ['editionQid'], equals: EDICOES_WFC[0] },
      },
    });
    const wfcRows2 = await prisma.knowledgeGraph.findMany({
      where: {
        relation: 'WON',
        metadata: { path: ['editionQid'], equals: EDICOES_WFC[1] },
      },
    });
    const alvosWfc = [...wfcRows, ...wfcRows2];
    console.log(
      `\n1. World Football Challenge (${EDICOES_WFC.join(', ')}): ${alvosWfc.length} aresta(s)`,
    );
    for (const row of alvosWfc) {
      const meta = (row.metadata as Record<string, unknown> | null) ?? {};
      console.log(
        `   - ${row.id} ${row.sourceType}:${row.sourceId} → ${row.targetType}:${row.targetId} ano=${String(meta.year)} edition=${String(meta.editionQid)}`,
      );
      if (apply) await prisma.knowledgeGraph.delete({ where: { id: row.id } });
    }

    // ── 2. Renomeia a competição da Copa de la Liga ────────────────────────────
    const copa = await prisma.competition.findUnique({
      where: { qid: QID_COPA_DE_LA_LIGA },
      select: { id: true, name: true },
    });
    console.log(`\n2. Q493331: nome atual = "${copa?.name ?? '(entidade ausente)'}"`);
    let renomeadas = 0;
    if (copa && copa.name === 'Copa de la Queens') {
      renomeadas = 1;
      console.log(`   → "${NOME_CORRETO_COPA_DE_LA_LIGA}"`);
      if (apply) {
        await prisma.competition.update({
          where: { id: copa.id },
          data: { name: NOME_CORRETO_COPA_DE_LA_LIGA },
        });
      }
    } else {
      console.log('   nada a fazer (nome já correto ou entidade não é a vandalizada).');
    }

    // ── 3. Re-classifica Intercontinental Cup 'nacional' → 'mundial' ──────────
    const inter = await prisma.competition.findUnique({
      where: { qid: QID_INTERCONTINENTAL },
      select: { id: true, name: true },
    });
    console.log(
      `\n3. Intercontinental Cup (Q182473): ${inter ? `entidade ${inter.id}` : 'ENTIDADE AUSENTE'}`,
    );
    let reclassificadas = 0;
    if (inter) {
      const rows = await prisma.knowledgeGraph.findMany({
        where: { relation: 'WON', targetId: inter.id, targetType: 'Competition' },
      });
      const erradas = rows.filter((r) => {
        const meta = (r.metadata as Record<string, unknown> | null) ?? {};
        return meta.hierarchy === 'nacional';
      });
      console.log(
        `   ${erradas.length} aresta(s) com hierarchy 'nacional' (de ${rows.length} vivas)`,
      );
      for (const row of erradas) {
        const meta = (row.metadata as Record<string, unknown> | null) ?? {};
        console.log(`   - ${row.id} ${row.sourceType}:${row.sourceId} ano=${String(meta.year)}`);
        if (apply) {
          await prisma.knowledgeGraph.update({
            where: { id: row.id },
            data: { metadata: { ...meta, hierarchy: 'mundial' } },
          });
        }
      }
      reclassificadas = erradas.length;
    }

    console.log(
      `\nRESUMO: ${alvosWfc.length} aresta(s) WFC removida(s) · ${renomeadas} renomeação · ${reclassificadas} reclassificação(ões)`,
    );
    if (!apply) {
      console.log('DRY-RUN: nada foi escrito.');
    } else {
      console.log(
        'APLICADO. Reversão: as arestas removidas estão listadas acima com id e metadata completos.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /cure-titles-dq02\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
