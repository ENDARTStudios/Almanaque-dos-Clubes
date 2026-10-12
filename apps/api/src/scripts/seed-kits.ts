/**
 * T523-kits — Uniformes históricos por temporada a partir da pt.Wikipédia.
 *
 * FONTE E HONESTIDADE (descoberta medida antes de construir):
 *  - o Commons NÃO tem "uniforme por temporada" pronto: tem PEÇAS de padrão do
 *    template {{CamisaFutebol}}/{{EquipamentoFutebol}} (corpo, mangas, calção,
 *    meião — `File:Kit body <padrão>.png`), muitas com temporada no código
 *    (`fluminense23h` = 2023 titular);
 *  - a COMPOSIÇÃO de cada uniforme (qual padrão + qual cor em cada parte, qual
 *    o tipo: titular/reserva/terceiro/goleiro/treino) vive nas chamadas do
 *    template no wikitexto dos artigos (ou da subpredefinição `Uniformes do X`);
 *  - este script lê essas chamadas, compõe o uniforme (que a UI renderiza em CSS
 *    como a Wikipédia faz) e verifica CADA arquivo no Commons (imageinfo:
 *    existência + licença + sem pedido de exclusão) antes de gravar.
 *
 * Não-invenção: peça sem arquivo verificado vira cor sólida; kit sem padrão nem
 * cor não entra; temporada só é rotulada quando o CÓDIGO da peça a indica
 * (`_fla26h` → 2026); código sem ano → season=null ("uniforme atual da fonte").
 * Reuso de padrão de outro clube (ex.: `sport23a` no calção do Fluminense) é
 * mantido como está — é a composição da fonte.
 *
 * Uso:
 *   DRY-RUN: node dist/scripts/seed-kits.js            (imprime tudo; não grava)
 *   APPLY:   node dist/scripts/seed-kits.js --apply
 *   Um clube: --club="Fluminense"
 */
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';
import {
  parseKitCalls,
  typeFromCall,
  decodeSeason,
  buildParts,
  fetchWikitext,
  isNonKitCall,
  recomputeOrdinals,
  parseInfoboxKits,
  type KitEntry,
  type KitPart,
} from '../lib/wikipedia/kit-composition.js';

const APPLY = process.argv.includes('--apply');
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const UA =
  'AlmanaqueDosClubes/0.1 (kits seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

/**
 * Uniformes com IMAGEM única (foto/render), curados explicitamente — cada arquivo
 * é re-verificado ao vivo (imageinfo: existe + licença + sem exclusão) antes de
 * entrar. Temporada/tipo vêm do nome do arquivo e do contexto do artigo; os
 * ambíguos ficaram fora.
 */
const DIRECT_KITS: Record<
  string,
  Array<{ season: string | null; type: KitEntry['type']; label: string; file: string }>
> = {
  'Fluminense F.C.': [
    { season: '2021', type: 'home', label: 'Camisa 10 (2021)', file: 'File:Camisaffc102021.jpg' },
    { season: '2022', type: 'third', label: 'Terceira (2022)', file: 'File:Camisa3ffc2022.jpg' },
    {
      season: '2023',
      type: 'goalkeeper',
      label: 'Goleiro (2023)',
      file: 'File:Camisaffc12023.jpg',
    },
  ],
  'Arsenal F.C.': [
    {
      season: '2004-05',
      type: 'home',
      label: 'Home 2004-05',
      file: 'File:Arsenal FC home kit 2004-05.jpg',
    },
    { season: '1991', type: 'other', label: '1991-01', file: 'File:Arsenal1991-01.jpg' },
  ],
  'Liverpool F.C.': [
    {
      season: '1892-96',
      type: 'other',
      label: '1892-96',
      file: 'File:Liverpool FC 1892-1896 kit.jpg',
    },
  ],
};

/** clube do acervo (por QID) → página(s) pt.wiki a parsear. */
export const CLUB_SOURCES: Array<{ qid: string; name: string; pages: string[] }> = [
  {
    qid: 'Q80987',
    name: 'Fluminense F.C.',
    pages: ['Predefinição:Uniformes do Fluminense Football Club'],
  },
  { qid: 'Q17479', name: 'Clube de Regatas do Flamengo', pages: ['Clube de Regatas do Flamengo'] },
  {
    qid: 'Q80964',
    name: 'Sociedade Esportiva Palmeiras',
    pages: ['Sociedade Esportiva Palmeiras'],
  },
  { qid: 'Q35933', name: 'S.C. Corinthians Paulista', pages: ['Sport Club Corinthians Paulista'] },
  { qid: 'Q221695', name: 'Grêmio FBPA', pages: ['Grêmio Foot-Ball Porto Alegrense'] },
  { qid: 'Q80955', name: 'Santos F.C.', pages: ['Santos Futebol Clube'] },
  { qid: 'Q80958', name: 'Botafogo F.R.', pages: ['Botafogo de Futebol e Regatas'] },
  { qid: 'Q80845', name: 'S.C. Internacional', pages: ['Sport Club Internacional'] },
  { qid: 'Q188277', name: 'Cruzeiro E.C.', pages: ['Cruzeiro Esporte Clube'] },
  {
    qid: 'Q38568',
    name: 'São Paulo FC',
    pages: ['Predefinição:Uniformes do São Paulo Futebol Clube'],
  },
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { club: { type: 'string' } },
    allowPositionals: true,
  });
  const prisma = new PrismaClient();
  try {
    const fileCache = new Map<string, KitPart>();
    for (const src of CLUB_SOURCES) {
      if (values.club && src.name !== values.club) continue;
      const club = await prisma.club.findFirst({
        where: { qid: src.qid, deletedAt: null },
        select: { id: true, name: true, kitHistory: true },
      });
      if (!club) {
        console.log(`[${src.name}] clube ausente no acervo (QID ${src.qid}) — gap`);
        continue;
      }

      const entries: KitEntry[] = [];
      for (const page of src.pages) {
        const wikitext = await fetchWikitext(page);
        await sleep(400);
        if (!wikitext) {
          console.log(`[${src.name}] página não encontrada: ${page} — gap`);
          continue;
        }
        const sourceUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`;
        // Os dois schemas da pt.Wikipédia: chamadas de template (CamisaFutebol/
        // EquipamentoFutebol) e parâmetros numerados na infobox (skin1/corpo1…).
        const calls = [
          ...parseKitCalls(wikitext, sourceUrl),
          ...parseInfoboxKits(wikitext, sourceUrl),
        ]
          .filter((c) => !isNonKitCall(c))
          .sort((a, b) => a.start - b.start);
        recomputeOrdinals(calls);
        for (const call of calls) {
          const parts = await buildParts(call.params, fileCache);
          if (!parts) continue; // kit sem padrão nem cor: nada a compor
          const patterns = Object.values(parts).map((p) => p.pattern);
          entries.push({
            season: decodeSeason(patterns),
            type: typeFromCall(call, patterns),
            label: call.title || call.section,
            parts,
            sourceUrl: call.sourceUrl,
          });
        }
      }

      // fotos diretas curadas (verificação ao vivo)
      for (const d of DIRECT_KITS[src.name] ?? []) {
        const fileTitle = d.file;
        const [name] = [fileTitle.replace(/^File:/, '')];
        const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
          action: 'query',
          titles: fileTitle,
          prop: 'imageinfo',
          iiprop: 'url|extmetadata',
          format: 'json',
        })}`;
        const res = await fetch(url, { headers: { 'user-agent': UA } });
        const json = (await res.json()) as {
          query?: {
            pages?: Record<
              string,
              {
                imageinfo?: Array<{
                  url?: string;
                  extmetadata?: Record<string, { value?: string }>;
                }>;
              }
            >;
          };
        };
        const ii = Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0];
        const em = ii?.extmetadata ?? {};
        const clean = (k: string) =>
          em[k]?.value ? em[k]!.value.replace(/<[^>]+>/g, '').trim() : null;
        if (!ii?.url || !clean('LicenseShortName') || clean('DeletionReason')) {
          console.log(`   direta fora: ${name} (sem licença/verificação)`);
          continue;
        }
        entries.push({
          season: d.season,
          type: d.type,
          label: d.label,
          parts: {
            leftarm: { pattern: null, color: null, file: null, fileUrl: null, license: null },
            body: { pattern: null, color: null, file: null, fileUrl: null, license: null },
            rightarm: { pattern: null, color: null, file: null, fileUrl: null, license: null },
            shorts: { pattern: null, color: null, file: null, fileUrl: null, license: null },
            socks: { pattern: null, color: null, file: null, fileUrl: null, license: null },
          },
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle.replace(/ /g, '_'))}`,
          image: {
            url: ii.url,
            sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle.replace(/ /g, '_'))}`,
            license: clean('LicenseShortName') as string,
          },
        });
      }

      // dedup: o mesmo uniforme pode aparecer no artigo E na infobox — a chave
      // física é (temporada, tipo, padrão do corpo); o rótulo não entra.
      const seen = new Set<string>();
      const dedup = entries.filter((e) => {
        const k = `${e.season}|${e.type}|${e.parts.body.pattern ?? e.image?.url ?? e.label}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const seasons = [...new Set(dedup.map((e) => e.season ?? '(atual)'))];
      console.log(
        `[${src.name}] kits=${dedup.length} temporadas=[${seasons.join(', ')}] tipos=[${[...new Set(dedup.map((e) => e.type))].join(', ')}]`,
      );
      for (const e of dedup) {
        const missing = Object.entries(e.parts)
          .filter(([, p]) => p.pattern && !p.file)
          .map(([k]) => k);
        console.log(
          `   ${String(e.season ?? '(atual)').padEnd(8)} ${e.type.padEnd(11)} ${e.label.padEnd(10)}` +
            ` body=${e.parts.body.pattern ?? e.parts.body.color ?? '—'}` +
            (missing.length ? ` | SEM ARQUIVO: ${missing.join(',')}` : ''),
        );
      }

      if (!APPLY) continue;
      const payload = JSON.stringify(dedup);
      const hash = createHash('sha256').update(payload).digest('hex');
      const currentHash = club.kitHistory
        ? createHash('sha256').update(JSON.stringify(club.kitHistory)).digest('hex')
        : null;
      if (hash === currentHash) {
        console.log(`   já gravado idêntico — noop`);
        continue;
      }
      if (dedup.length === 0) continue;
      await prisma.club.update({
        where: { id: club.id },
        data: { kitHistory: dedup as unknown as Prisma.InputJsonValue },
      });
      console.log(`   gravado (kitHistory).`);
    }
    const total = await prisma.club.count({ where: { kitHistory: { not: Prisma.DbNull } } });
    console.log(`\nclubes com kitHistory: ${total}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-kits')) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, '[t523-kits] falha no seed de uniformes');
      process.exit(1);
    });
}
