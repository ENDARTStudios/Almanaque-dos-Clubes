/**
 * DQ-01 — CLI da matriz de cobertura. Imprime a matriz completa ou só o piloto
 * (Série A, Premier League, Libertadores) em markdown; `--json` devolve o JSON
 * cru (mesma carga do GET /coverage).
 *
 *   node dist/scripts/coverage-matrix.js                 # piloto em markdown
 *   node dist/scripts/coverage-matrix.js --all           # acervo inteiro
 *   node dist/scripts/coverage-matrix.js --json          # JSON do piloto
 */
import { buildCoverageMatrix, renderMarkdown } from '../modules/coverage/coverage.service.js';
import { prisma } from '../config/prisma.js';

async function main(): Promise<void> {
  const all = process.argv.includes('--all');
  const json = process.argv.includes('--json');
  try {
    const matrix = await buildCoverageMatrix(!all);
    if (json) {
      console.log(JSON.stringify(matrix, null, 2));
      return;
    }
    const escopo = all ? 'ACERVO COMPLETO' : 'PILOTO MVP (Série A · Premier League · Libertadores)';
    console.log(`\nMATRIZ DE COBERTURA (DQ-01) · ${escopo} · gerada em ${matrix.generatedAt}\n`);
    console.log(renderMarkdown(matrix));
    const semResultado = matrix.rows.filter((r) => r.matchesTotal > 0 && r.matchesWithScore === 0);
    if (semResultado.length > 0) {
      console.log(
        `\nLACUNAS (partidas sem placar): ${semResultado.length} recorte(s) — declarados, não escondidos.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
