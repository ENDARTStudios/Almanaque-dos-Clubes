/**
 * T420 — Seed de resultados (RSSSF) para o banco.
 *
 * Modo default é DRY-RUN: baixa o texto RSSSF, faz parse + normalização Zod e
 * reporta quantas partidas seriam ingeridas. Nada é gravado em produção.
 *
 * Com --apply, grava no banco apontado por DATABASE_URL usando o repositório Prisma
 * (resolução clube/competição contra o acervo, sem criar órfãos).
 *
 * Uso:
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-matches.ts \
 *     --url=<rsssf_url> --competition=<nome> --season=<ano>            # DRY-RUN
 *   pnpm --filter @almanaque/api exec tsx scripts/seed-matches.ts \
 *     --url=<rsssf_url> --competition=<nome> --season=<ano> --apply
 *
 * Reversível: `DELETE FROM matches WHERE "importedFrom"='rsssf';`
 */
import { PrismaClient } from '@prisma/client';
import {
  parseRsssfMatches,
  fetchRsssfText,
} from '../src/modules/etl/connectors/rsssf-matches.connector.js';
import {
  ingestMatches,
  type LookupClub,
  type LookupCompetition,
  type LookupSeason,
  type MatchProvenance,
  type MatchIngestRepo,
} from '../src/modules/etl/ingestion.service.js';

const APPLY = process.argv.includes('--apply');
const arg = (name: string): string | null => {
  const found = process.argv.find((a) => a.startsWith('--' + name + '='));
  return found ? found.slice(('--' + name + '=').length) : null;
};

const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (rsssf matches ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

async function main(): Promise<void> {
  const url = arg('url');
  const competitionName = arg('competition');
  const season = arg('season');
  if (!url || !competitionName || !season) {
    console.error(
      'Uso: tsx scripts/seed-matches.ts --url=<rsssf_url> --competition=<nome> --season=<ano> [--apply]',
    );
    process.exit(1);
  }
  const provenance: Omit<MatchProvenance, 'importedAt'> = {
    dataSource: 'rsssf',
    sourceUrl: url,
    license: 'RSSSF (texto público, citar fonte)',
  };

  console.log('Baixando ' + url + ' ...');
  const text = await fetchRsssfText(url, USER_AGENT);
  const result = parseRsssfMatches(text, { competitionName, season, sourceUrl: url });
  console.log('Partidas parseadas: ' + result.matches.length);
  console.log('Linhas puladas (revisão): ' + result.skipped.length);
  for (const s of result.skipped.slice(0, 5)) console.log('  skip: ' + JSON.stringify(s));

  if (!APPLY) {
    console.log('DRY-RUN — nada gravado. Rode com --apply para persistir.');
    for (const m of result.matches.slice(0, 5))
      console.log(
        '  ' + m.date + ' ' + m.homeName + ' ' + m.homeScore + '-' + m.awayScore + ' ' + m.awayName,
      );
    return;
  }

  const prisma = new PrismaClient();
  const repo = await buildPrismaRepo(prisma);
  const summary = await ingestMatches(result.matches, repo, provenance);
  const total = await prisma.match.count();
  console.log(
    'Ingeridos=' +
      summary.inserted +
      ' | já-existiam=' +
      summary.alreadyExists +
      ' | rejeitados=' +
      summary.rejected,
  );
  console.log('MATCHES total=' + total);
  await prisma.$disconnect();
}

/** Repositório Prisma: carrega acervo uma vez e resolve por QID/nome normalizado. */
async function buildPrismaRepo(prisma: PrismaClient): Promise<MatchIngestRepo> {
  const [clubs, competitions, seasons] = await Promise.all([
    prisma.club.findMany({ select: { id: true, name: true, qid: true } }),
    prisma.competition.findMany({ select: { id: true, name: true, qid: true } }),
    prisma.season.findMany({ select: { id: true, name: true } }),
  ]);
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const clubByQid = new Map<string, LookupClub>();
  const clubByName = new Map<string, LookupClub>();
  for (const c of clubs) {
    if (c.qid) clubByQid.set(c.qid, c);
    clubByName.set(norm(c.name), c);
  }
  const compByQid = new Map<string, LookupCompetition>();
  const compByName = new Map<string, LookupCompetition>();
  for (const c of competitions) {
    if (c.qid) compByQid.set(c.qid, c);
    compByName.set(norm(c.name), c);
  }
  const seasonByName = new Map<string, LookupSeason>();
  for (const s of seasons) seasonByName.set(s.name, s);

  return {
    findClubByQid: async (qid) => clubByQid.get(qid) || null,
    findClubByName: async (name) => clubByName.get(norm(name)) || null,
    findCompetitionByQid: async (qid) => compByQid.get(qid) || null,
    findCompetitionByName: async (name) => compByName.get(norm(name)) || null,
    findSeasonByName: async (name) => seasonByName.get(name) || null,
    upsertMatch: async (row, prov) => {
      const existing = await prisma.match.findUnique({ where: { dedupKey: row.dedupKey } });
      if (existing) return { created: false };
      await prisma.match.create({
        data: {
          homeClubId: row.homeClubId,
          awayClubId: row.awayClubId,
          date: new Date(row.dateISO),
          competitionId: row.competitionId,
          seasonId: row.seasonId,
          homeScore: row.homeScore,
          awayScore: row.awayScore,
          round: row.round,
          venue: row.venue,
          status: 'FINISHED',
          importedFrom: prov.dataSource,
          importedAt: prov.importedAt,
          sourceUrl: prov.sourceUrl,
          license: prov.license,
          dedupKey: row.dedupKey,
        },
      });
      return { created: true };
    },
    upsertTitle: async () => ({ created: true }),
  };
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
