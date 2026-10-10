/**
 * T509 (W6) — troféu da competição via Wikimedia Commons (busca curada).
 *
 * Diagnóstico 10/10: P18 no item da competição é ESCASSO (Libertadores e Copa do
 * Brasil sem P18; UCL tem o LOGO, não o troféu). Fonte viável: a busca do Commons
 * por "{nome da competição} trophy" — com CURA CONSERVADORA: só aceita arquivo
 * cujo TÍTULO contenha 'troph|trofeu|troféu|cup|taça|taca', e cujo MIME seja
 * imagem. Sem correspondência clara ⇒ null (nunca uma foto de final/estádio).
 *
 * Uso: DRY-RUN (default) `node dist/scripts/enrich-trophies.js [--limit=20]`; `--apply`.
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { commonsFilePath } from '../modules/etl/connectors/wikidata-media.connector.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { apply: { type: 'boolean', default: false }, limit: { type: 'string', default: '40' } },
});
const APPLY_ON = values.apply || APPLY;
const LIMIT = parseInt(values.limit ?? '40', 10) || 40;
const UA =
  'AlmanaqueDosClubes/0.1 (trophy enrich; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const TROPHY_RE = /troph|trofeu|troféu|cup|taça|taca/i;

/** Busca no Commons arquivos cujo título indica TROFÉU (curadoria conservadora). */
export async function findTrophyFile(
  competitionName: string,
  opts: { fetchImpl?: typeof globalThis.fetch } = {},
): Promise<string | null> {
  const { fetchImpl = globalThis.fetch } = opts;
  const q = `${competitionName} trophy`;
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(q)}&srnamespace=6&srlimit=10&format=json`;
  const res = await fetchImpl(url, { headers: { 'user-agent': UA } });
  if (!res.ok) return null;
  const json = (await res.json()) as { query?: { search?: Array<{ title?: string }> } };
  for (const hit of json.query?.search ?? []) {
    const title = hit.title ?? '';
    // 'File:Foo.jpg' → nome do arquivo
    const file = title.replace(/^File:/i, '');
    if (!TROPHY_RE.test(file)) continue; // curadoria: só título que diga troféu
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue; // sem SVG/PDF aqui
    return file;
  }
  return null;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const comps = await prisma.competition.findMany({
      where: { deletedAt: null, trophyImageUrl: null },
      select: { id: true, name: true, qid: true },
      take: LIMIT,
      orderBy: { name: 'asc' },
    });
    console.log(
      `[t509] escopo: ${comps.length} competições sem troféu · modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'}`,
    );
    let updated = 0;
    let noFile = 0;
    let samples = 0;
    for (const comp of comps) {
      const file = await findTrophyFile(comp.name);
      if (!file) {
        noFile += 1;
        continue;
      }
      if (samples < 5) {
        console.log(`  amostra: ${comp.name} → ${file}`);
        samples += 1;
      }
      if (APPLY_ON) {
        await prisma.competition.update({
          where: { id: comp.id },
          data: { trophyImageUrl: commonsFilePath(file) },
        });
        updated += 1;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`[t509] fim: atualizadas=${APPLY_ON ? updated : 0} (dry) · sem-arquivo=${noFile}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('enrich-trophies')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t509] falha no enriquecimento de troféus');
      process.exit(1);
    });
}
