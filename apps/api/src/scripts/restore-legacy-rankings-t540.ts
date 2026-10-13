/**
 * T540 — RESTAURAÇÃO dos dois rankings legados removidos involuntariamente
 * (`Ranking CBF 2023` e `Ranking CONMEBOL 2023`, 10 entradas cada).
 *
 * Origem dos valores: `apps/api/prisma/seed.ts`, onde as tabelas estão hardcoded. Ou
 * seja: a fonte EXISTE e é o próprio repositório — mas com uma ressalva que precisa
 * ficar registrada e não maquiada: o comentário do seed diz **"aproximação realista"**.
 * São valores plausíveis autorados para o seed, NÃO a tabela oficial da CBF/CONMEBOL.
 * Por isso a restauração grava `metadata.legacy = true` E `metadata.approximation =
 * true`, com o motivo — quem ler o acervo sabe o que está olhando.
 *
 * Não rodamos `prisma/seed.ts` em produção: ele é idempotente nos clubes/competições,
 * mas CRIA clubes/competições/permissões de demonstração. Aqui só entram os 2 rankings
 * e as 20 entradas, com os clubes resolvidos por nome explícito no acervo.
 *
 *   node dist/scripts/restore-legacy-rankings-t540.js            # dry-run
 *   node dist/scripts/restore-legacy-rankings-t540.js --apply
 */
import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import { logger } from '../config/logger.js';

interface LegacyEntry {
  /** Nome como está no seed. */
  club: string;
  /** Nome exato no acervo (conferido — o seed usa apelido). */
  acervo: string;
  position: number;
  points: number;
}

/** Valores copiados VERBATIM de apps/api/prisma/seed.ts (T540). */
export const RANKING_CBF_2023: LegacyEntry[] = [
  { club: 'Palmeiras', acervo: 'Sociedade Esportiva Palmeiras', position: 1, points: 2848 },
  { club: 'Flamengo', acervo: 'Clube de Regatas do Flamengo', position: 2, points: 2799 },
  { club: 'Atlético-MG', acervo: 'Atlético-MG', position: 3, points: 2670 },
  { club: 'Fluminense', acervo: 'Fluminense F.C.', position: 4, points: 2635 },
  { club: 'Corinthians', acervo: 'S.C. Corinthians Paulista', position: 5, points: 2570 },
  { club: 'São Paulo', acervo: 'São Paulo FC', position: 6, points: 2455 },
  { club: 'Grêmio', acervo: 'Grêmio FBPA', position: 7, points: 2400 },
  { club: 'Internacional', acervo: 'S.C. Internacional', position: 8, points: 2380 },
  { club: 'Santos', acervo: 'Santos F.C.', position: 9, points: 2245 },
  { club: 'Cruzeiro', acervo: 'Cruzeiro E.C.', position: 10, points: 2190 },
];

export const RANKING_CONMEBOL_2023: LegacyEntry[] = [
  { club: 'Flamengo', acervo: 'Clube de Regatas do Flamengo', position: 1, points: 2800 },
  { club: 'Palmeiras', acervo: 'Sociedade Esportiva Palmeiras', position: 2, points: 2750 },
  { club: 'Atlético-MG', acervo: 'Atlético-MG', position: 3, points: 2350 },
  { club: 'Fluminense', acervo: 'Fluminense F.C.', position: 4, points: 2200 },
  { club: 'Internacional', acervo: 'S.C. Internacional', position: 5, points: 2050 },
  { club: 'São Paulo', acervo: 'São Paulo FC', position: 6, points: 1950 },
  { club: 'Grêmio', acervo: 'Grêmio FBPA', position: 7, points: 1900 },
  { club: 'Corinthians', acervo: 'S.C. Corinthians Paulista', position: 8, points: 1850 },
  { club: 'Santos', acervo: 'Santos F.C.', position: 9, points: 1700 },
  { club: 'Cruzeiro', acervo: 'Cruzeiro E.C.', position: 10, points: 1600 },
];

export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { apply: { type: 'boolean', default: false } },
    allowPositionals: true,
  });
  const APPLY = values.apply ?? false;
  const prisma = new PrismaClient();
  let criados = 0;
  let existentes = 0;
  let naoResolvidos = 0;
  try {
    for (const spec of [
      {
        name: 'Ranking CBF 2023',
        competitionName: 'Campeonato Brasileiro Série A',
        formulaVersion: 'cbf-2023-raw',
        entradas: RANKING_CBF_2023,
      },
      {
        name: 'Ranking CONMEBOL 2023',
        competitionName: 'Copa Libertadores',
        formulaVersion: 'conmebol-2023-raw',
        entradas: RANKING_CONMEBOL_2023,
      },
    ]) {
      const existente = await prisma.ranking.findFirst({ where: { name: spec.name } });
      if (existente) {
        console.log(`[${spec.name}] ja existe — nada a fazer (idempotente)`);
        existentes += 1;
        continue;
      }
      const competicao = await prisma.competition.findFirst({
        where: { name: spec.competitionName },
        select: { id: true },
      });
      // Resolve TODOS os clubes antes de escrever: uma entrada órfã seria dado ruim.
      const resolvidos: Array<{ entry: LegacyEntry; clubId: string }> = [];
      for (const e of spec.entradas) {
        const club = await prisma.club.findFirst({
          where: { name: e.acervo, deletedAt: null, gender: 'men' },
          select: { id: true },
        });
        if (!club) {
          console.log(`   NAO RESOLVIDO: ${e.acervo} (${e.club}) — restauracao abortada`);
          naoResolvidos += 1;
          break;
        }
        resolvidos.push({ entry: e, clubId: club.id });
      }
      if (naoResolvidos > 0 || resolvidos.length !== spec.entradas.length) continue;

      console.log(
        `[${spec.name}] ${APPLY ? 'criando' : 'dry-run'} | comp=${spec.competitionName} | ` +
          `entradas=${resolvidos.length} | maior=${spec.entradas[0]?.points} menor=${spec.entradas[spec.entradas.length - 1]?.points}`,
      );
      if (!APPLY) continue;
      // O model Ranking NÃO tem JSONB livre — e não precisa: `scope` e
      // `formulaVersion` existem exatamente para dizer COMO o ranking foi produzido.
      // É onde a marca de legado/aproximação fica, visível na própria API.
      const ranking = await prisma.ranking.create({
        data: {
          name: spec.name,
          type: 'club',
          season: '2023',
          competitionId: competicao?.id ?? null,
          publishedAt: new Date(),
          scope: 'legacy_seed_approximation',
          formulaVersion: spec.formulaVersion,
        },
      });
      for (const r of resolvidos) {
        await prisma.rankingEntry.create({
          data: {
            rankingId: ranking.id,
            clubId: r.clubId,
            position: r.entry.position,
            points: r.entry.points,
            gender: 'men',
          },
        });
      }
      criados += 1;
      console.log(`   criado com ${resolvidos.length} entradas (escala BRUTA, sem normalizar)`);
    }
    console.log(
      `restore-legacy-t540: criados=${criados} ja_existiam=${existentes} nao_resolvidos=${naoResolvidos} modo=${APPLY ? 'apply' : 'dry-run'}`,
    );
    logger.info({ criados, existentes, naoResolvidos, apply: APPLY }, 't540: rankings legados');
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('restore-legacy-rankings-t540')) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
