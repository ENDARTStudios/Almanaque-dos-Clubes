/**
 * T509/T511 (W6) — troféu da competição via Wikimedia Commons — CURADORIA.
 *
 * Diagnóstico honesto (T509 revertido 10/10): a busca textual aberta gerou
 * FALSOS POSITIVOS de outros esportes ('2. Liga' ← Grey Cup, 'A Championship' ←
 * Rugby Championship). Busca aberta NÃO serve. A fonte correta é a CATEGORIA
 * dedicada do Commons ("... trophy") + ARQUIVO explícito por competição.
 *
 * Este script usa um MAPA CURADO (QID → categoria Commons → arquivo). Cada par
 * foi conferido À MÃO na categoria do Commons em 10/10 (ver comentário de cada
 * linha). Antes de gravar, o arquivo é VALIDADO AO VIVO no Commons
 * (`prop=imageinfo`): precisa existir e ter MIME de imagem — senão é descartado
 * (jamais gravar URL inválida).
 *
 * Uso (produção, dentro do container):
 *   node dist/scripts/enrich-trophies.js                  # DRY-RUN (verifica e mostra)
 *   node dist/scripts/enrich-trophies.js --apply
 *   node dist/scripts/enrich-trophies.js --rollback --apply
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { commonsFilePath } from '../modules/etl/connectors/wikidata-media.connector.js';
import { logger } from '../config/logger.js';

const UA =
  'AlmanaqueDosClubes/0.1 (trophy curation; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

export interface TrophyEntry {
  qid: string;
  name: string;
  /** Arquivo no Commons (nome do arquivo, sem "File:"). */
  file: string;
  /** Categoria do Commons que comprova que o arquivo é o troféu da competição. */
  category: string;
}

/**
 * MAPA CURADO. Toda entrada tem categoria do Commons contendo "troph" (invariante
 * testado em `tests/unit/lib/trophy-curation.test.ts`), o que garante que o
 * arquivo pertence a uma categoria de TROFÉU — não a uma categoria de evento.
 */
export const TROPHY_MAP: TrophyEntry[] = [
  // categoria: "Copa Conmebol Libertadores trophy"
  {
    qid: 'Q184795',
    name: 'Copa Libertadores',
    file: 'Troféu Copa Libertadores 2019.jpg',
    category: 'Copa Conmebol Libertadores trophy',
  },
  // categoria: "Trophy of Copa do Brasil"
  {
    qid: 'Q843989',
    name: 'Copa do Brasil',
    file: 'Trofeu Copa do Brasil 2007.jpg',
    category: 'Trophy of Copa do Brasil',
  },
  // categoria: "Trophy of Campeonato Brasileiro Série A"
  {
    qid: 'Q206813',
    name: 'Campeonato Brasileiro Série A',
    file: 'Troféu do Campeonato Brasileiro de 2019.jpg',
    category: 'Trophy of Campeonato Brasileiro Série A',
  },
  // categoria: "UEFA Champions League trophy"
  {
    qid: 'Q18756',
    name: 'UEFA Champions League',
    file: 'Champions league trophy.jpg',
    category: 'UEFA Champions League trophy',
  },
  // categoria: "FA Premier League" + "Trophies" (desc: Premier League Trophy no National Football Museum)
  {
    qid: 'Q9448',
    name: 'Premier League',
    file: "Premier League Trophy at Manchester's National Football Museum (Ank Kumar) 02.jpg",
    category: 'Trophies',
  },
  // categoria: "Primera División trophy"
  {
    qid: 'Q324867',
    name: 'La Liga',
    file: 'Trofeo de La Liga 9900.jpg',
    category: 'Primera División trophy',
  },
  // categoria: "Association football trophy icons of Italy" (desc: Coppa Campioni d'Italia (Serie A))
  {
    qid: 'Q15804',
    name: 'Serie A',
    file: 'Coppa Campioni d’Italia.jpg',
    category: 'Association football trophy icons of Italy',
  },
  // categoria: "Copa América trophy"
  {
    qid: 'Q178750',
    name: 'Copa América',
    file: 'Copa america trofeo.jpg',
    category: 'Copa América trophy',
  },
  // categoria: "FIFA World Cup trophy"
  {
    qid: 'Q19317',
    name: 'FIFA World Cup',
    file: 'FIFA World Cup Trophy photo by Djuradj Vujcic.jpg',
    category: 'FIFA World Cup trophy',
  },
  // categoria: "Copa Sudamericana trophy"
  {
    qid: 'Q60585',
    name: 'Copa Sudamericana',
    file: 'Taça da Copa Sul-Americana de 2016.jpg',
    category: 'Copa Sudamericana trophy',
  },
  // categoria: "FIFA Club World Cup trophy"
  {
    qid: 'Q223366',
    name: 'FIFA Club World Cup',
    file: 'Taça do Mundial 2012, nos jardins do Parque São Jorge.jpg',
    category: 'FIFA Club World Cup trophy',
  },
  // categoria: "Trophy of FA Cup"
  { qid: 'Q11151', name: 'FA Cup', file: 'The FA Cup Trophy.jpg', category: 'Trophy of FA Cup' },
  // categoria: "Copa del Rey (association football) trophy icons"
  {
    qid: 'Q483794',
    name: 'Copa del Rey',
    file: 'Copa del Rey Trophy.png',
    category: 'Copa del Rey (association football) trophy icons',
  },
  // categoria: "Coppa Italia trophy" (foto do troféu, com pessoas em quadro)
  {
    qid: 'Q169918',
    name: 'Coppa Italia',
    file: 'The Coppa Italia trophy.jpg',
    category: 'Coppa Italia trophy',
  },
  // T513 — categoria: "Trophy of Fußball-Bundesliga (Germany)" (foto do troféu, sem pessoas)
  {
    qid: 'Q82595',
    name: 'Bundesliga',
    file: 'Trophy of Fußball-Bundesliga in Singapore, 2023.jpg',
    category: 'Trophy of Fußball-Bundesliga (Germany)',
  },
  // GAPS DECLARADOS (T513) — NUNCA busca textual (lição T509):
  //  · Ligue 1 (Q13394): "Ligue 1 trophy icons" só tem "Ligue 1 Trophy 2024.png"
  //    (EM PEDIDO DE EXCLUSÃO desde jul/2026 — quebraria) e "Ligue1 trophy.svg"
  //    (esboço à mão, 100x100, "free hand work"). Melhor null que imagem duvidosa.
  //  · Eredivisie (Q167541): não existe categoria de troféu (o "Johan Cruijff
  //    Schaal" é a SUPERCOPA, não a taça da liga).
  // T514 — categoria: "UEFA Cup trophy" (+ "UEFA Europa League trophy icons").
  // A Europa League sucedeu a Taça UEFA e o TROFÉU FÍSICO é o mesmo.
  {
    qid: 'Q18760',
    name: 'UEFA Europa League',
    file: 'Coppauefa.png',
    category: 'UEFA Cup trophy',
  },
  // T515 — categoria: "Trophy of Campeonato Brasileiro Série B" (foto da taça de 2018)
  {
    qid: 'Q610175',
    name: 'Campeonato Brasileiro Série B',
    file: 'Serie B 2018.jpg',
    category: 'Trophy of Campeonato Brasileiro Série B',
  },
  // GAP DECLARADO (T514):
  //  · Primeira Liga (Q182994): NÃO existe categoria do troféu português — a busca
  //    só acha "Trophy of Primeira Liga do BRASIL", que é OUTRA competição.
  // GAPS DECLARADOS (T515): MLS ("Philip F. Anschutz MLS Cup trophy" só tem fotos
  //  de pessoas com a taça; "Major League Soccer trophies" tem uma foto do Obama) e
  //  Liga MX (não há categoria de troféu).
];

export interface CommonsFileInfo {
  exists: boolean;
  mime: string | null;
  width: number | null;
  height: number | null;
  description: string | null;
}

/** Valida um arquivo do Commons AO VIVO (existe? é imagem?). */
export async function fetchCommonsFileInfo(
  file: string,
  opts: { fetchImpl?: typeof globalThis.fetch } = {},
): Promise<CommonsFileInfo> {
  const { fetchImpl = globalThis.fetch } = opts;
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=mime|size|extmetadata` +
    `&titles=File:${encodeURIComponent(file)}&format=json&formatversion=2`;
  try {
    const res = await fetchImpl(url, { headers: { 'user-agent': UA } });
    if (!res.ok) return { exists: false, mime: null, width: null, height: null, description: null };
    const json = (await res.json()) as {
      query?: {
        pages?: Array<{
          missing?: boolean;
          imageinfo?: Array<{
            mime?: string;
            width?: number;
            height?: number;
            extmetadata?: { ImageDescription?: { value?: string } };
          }>;
        }>;
      };
    };
    const page = json.query?.pages?.[0];
    const ii = page?.imageinfo?.[0];
    if (!page || page.missing || !ii) {
      return { exists: false, mime: null, width: null, height: null, description: null };
    }
    const desc = ii.extmetadata?.ImageDescription?.value
      ?.replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      exists: true,
      mime: ii.mime ?? null,
      width: ii.width ?? null,
      height: ii.height ?? null,
      description: desc ? desc.slice(0, 120) : null,
    };
  } catch {
    return { exists: false, mime: null, width: null, height: null, description: null };
  }
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      apply: { type: 'boolean', default: false },
      rollback: { type: 'boolean', default: false },
    },
  });
  const APPLY_ON = values.apply || process.argv.includes('--apply');
  const ROLLBACK = values.rollback || process.argv.includes('--rollback');
  const prisma = new PrismaClient();
  try {
    if (ROLLBACK) {
      const qids = TROPHY_MAP.map((e) => e.qid);
      const comps = await prisma.competition.findMany({
        where: { qid: { in: qids } },
        select: { id: true, name: true },
      });
      console.log(`[t511] ROLLBACK de ${comps.length} competições do mapa curado`);
      if (APPLY_ON) {
        const r = await prisma.competition.updateMany({
          where: { qid: { in: qids } },
          data: { trophyImageUrl: null },
        });
        console.log(`[t511] trophyImageUrl zerado em ${r.count} competições.`);
      }
      return 0;
    }

    console.log(
      `[t511] mapa curado: ${TROPHY_MAP.length} competições · modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'}`,
    );
    let ok = 0;
    let missing = 0;
    let rejected = 0;
    for (const entry of TROPHY_MAP) {
      const comp = await prisma.competition.findFirst({
        where: { qid: entry.qid, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!comp) {
        console.log(`  ✗ ${entry.name} (${entry.qid}): competição ausente no acervo — pulada.`);
        missing += 1;
        continue;
      }
      const info = await fetchCommonsFileInfo(entry.file);
      const isImage = !!info.mime && info.mime.startsWith('image/');
      if (!info.exists || !isImage) {
        console.log(
          `  ✗ ${comp.name}: arquivo "${entry.file}" inválido no Commons (existe=${info.exists}, mime=${info.mime}) — RECUSADO.`,
        );
        rejected += 1;
        continue;
      }
      const url = commonsFilePath(entry.file);
      console.log(
        `  ✓ ${comp.name} → ${entry.file} (${info.mime} ${info.width}x${info.height}) · cat="${entry.category}"` +
          `\n      ${info.description ?? ''}\n      ${url}`,
      );
      if (APPLY_ON) {
        await prisma.competition.update({ where: { id: comp.id }, data: { trophyImageUrl: url } });
      }
      ok += 1;
      await new Promise((r) => setTimeout(r, 700)); // rate limit Commons
    }
    console.log(
      `[t511] fim: ${APPLY_ON ? 'gravados' : 'validados'}=${ok} · sem-competição=${missing} · recusados=${rejected}`,
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('enrich-trophies')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t511] falha no enriquecimento de troféus');
      process.exit(1);
    });
}
