/**
 * T538 — INGESTÃO DOS CLUBES AUSENTES que bloqueavam partidas.
 *
 * Contexto: o T529 declarou ~25 clubes como gap ("sem candidato") porque não existem
 * no acervo — e cada um deles custa as partidas em que aparece (Eibar, Huesca,
 * Sporting de Gijón, Málaga CF, sete clubes italianos, Paraná Clube, Joinville, LDU
 * Quito, Monagas, Táchira, Independiente Petrolero, Patronato). Aqui eles entram com
 * proveniência Wikidata, e o re-run dos seeds de partidas preenche o que era gap.
 *
 * REGRA DURA (D-2026-10-09): QID NUNCA vem de memória. Cada um foi derivado do artigo
 * da Wikipédia (pt) e validado no Wikidata — P31 = clube de futebol (Q476028) ou, no
 * caso do Patronato, clube desportivo (Q847017) COM P641/P115 de futebol. Os QIDs e
 * os nomes vêm do relatório de derivação, não de conhecimento prévio do modelo.
 *
 * Nomes = título do artigo pt (a convenção de nome do acervo). `Málaga CF` é o clube
 * ATUAL (Q8857) — o CD Málaga histórico (Q124518) já está no acervo e é outro clube.
 *
 *   node dist/scripts/seed-absent-clubs-t538.js            # dry-run
 *   node dist/scripts/seed-absent-clubs-t538.js --apply
 */
import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import { logger } from '../config/logger.js';

export interface AbsentClub {
  qid: string;
  name: string;
  country: string;
  /** Evidência da derivação (rótulo do P31 lido no Wikidata). */
  p31: string;
}

/** 18 clubes derivados do artigo pt e validados no Wikidata (fonte-scout, 13-10-2026). */
export const ABSENT_CLUBS: AbsentClub[] = [
  // La Liga (Espanha)
  { qid: 'Q770740', name: 'Sociedad Deportiva Eibar', country: 'ES', p31: 'clube de futebol' },
  { qid: 'Q11971', name: 'Sociedad Deportiva Huesca', country: 'ES', p31: 'clube de futebol' },
  { qid: 'Q12278', name: 'Real Sporting de Gijón', country: 'ES', p31: 'clube de futebol' },
  { qid: 'Q8857', name: 'Málaga Club de Fútbol', country: 'ES', p31: 'clube de futebol' },
  // Serie A (Itália)
  { qid: 'Q13391', name: 'Unione Sportiva Lecce', country: 'IT', p31: 'clube de futebol' },
  { qid: 'Q1120838', name: 'Como 1907', country: 'IT', p31: 'clube de futebol' },
  { qid: 'Q289482', name: 'Associazione Calcio Monza', country: 'IT', p31: 'clube de futebol' },
  { qid: 'Q759482', name: 'Unione Sportiva Cremonese', country: 'IT', p31: 'clube de futebol' },
  { qid: 'Q845043', name: 'Frosinone Calcio', country: 'IT', p31: 'clube de futebol' },
  {
    qid: 'Q847587',
    name: 'Unione Sportiva Salernitana 1919',
    country: 'IT',
    p31: 'clube de futebol',
  },
  { qid: 'Q13385', name: 'Ars et Labor Ferrara', country: 'IT', p31: 'clube de futebol' },
  // Brasileirão
  { qid: 'Q2035444', name: 'Joinville Esporte Clube', country: 'BR', p31: 'clube de futebol' },
  { qid: 'Q838534', name: 'Paraná Clube', country: 'BR', p31: 'clube de futebol' },
  // Libertadores
  {
    qid: 'Q1773830',
    name: 'Club Atlético Patronato',
    country: 'AR',
    p31: 'clube desportivo + P641/P115 futebol',
  },
  {
    qid: 'Q249643',
    name: 'Liga Deportiva Universitaria (Quito)',
    country: 'EC',
    p31: 'clube de futebol',
  },
  { qid: 'Q1636856', name: 'Monagas Sport Club', country: 'VE', p31: 'clube de futebol' },
  {
    qid: 'Q178378',
    name: 'Deportivo Táchira Fútbol Club',
    country: 'VE',
    p31: 'clube de futebol',
  },
  {
    qid: 'Q2018250',
    name: 'Club Independiente Petrolero',
    country: 'BO',
    p31: 'clube de futebol',
  },
];

export interface SeedReport {
  criados: number;
  existentes: number;
  detalhes: Array<{ qid: string; name: string; acao: 'created' | 'existe' }>;
}

export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { apply: { type: 'boolean', default: false } },
    allowPositionals: true,
  });
  const APPLY = values.apply ?? false;
  const prisma = new PrismaClient();
  const report: SeedReport = { criados: 0, existentes: 0, detalhes: [] };
  try {
    for (const c of ABSENT_CLUBS) {
      // Dedup por QID (chave natural do acervo) — nunca duplica.
      const existente = await prisma.club.findFirst({
        where: { qid: c.qid },
        select: { id: true, name: true, deletedAt: true },
      });
      if (existente) {
        report.existentes += 1;
        report.detalhes.push({ qid: c.qid, name: existente.name, acao: 'existe' });
        continue;
      }
      if (!APPLY) {
        report.detalhes.push({ qid: c.qid, name: c.name, acao: 'created' });
        continue;
      }
      await prisma.club.create({
        data: {
          qid: c.qid,
          name: c.name,
          country: c.country,
          gender: 'men',
          kind: 'club',
          status: 'ACTIVE',
          importedFrom: 'wikidata',
          importedAt: new Date(),
          sourceUrl: `https://www.wikidata.org/wiki/${c.qid}`,
          metadata: {
            t538: { p31: c.p31, derivedFrom: 'pt.wikipedia article', at: new Date().toISOString() },
          },
        },
      });
      report.criados += 1;
      report.detalhes.push({ qid: c.qid, name: c.name, acao: 'created' });
    }
    console.log(
      `absent-clubs-t538: candidatos=${ABSENT_CLUBS.length} criados=${report.criados} ` +
        `ja_existiam=${report.existentes} modo=${APPLY ? 'apply' : 'dry-run'}`,
    );
    for (const d of report.detalhes) console.log(`   ${d.acao.padEnd(7)} ${d.qid} ${d.name}`);
    logger.info({ ...report, apply: APPLY }, 't538: clubes ausentes');
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-absent-clubs-t538')) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
