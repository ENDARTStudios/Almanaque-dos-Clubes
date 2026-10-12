/**
 * T524 — Hinos dos clubes (gap explícito do Escopo 1: "Hino").
 *
 * FONTE E RESTRIÇÃO CRÍTICA (medido no discovery de 12-10-2026):
 *  - ÁUDIO: o Commons só tem hino livre para um clube do escopo
 *    (`File:Hino-do-São-Paulo-FC.ogg`, CC BY 4.0, Orquestra e Coro CID, ~1977) —
 *    verificado AO VIVO (existe + licença + sem exclusão) antes de gravar.
 *  - LETRA: os próprios artigos da pt.Wikipédia carregam o aviso "NÃO INSIRA A
 *    LETRA DO HINO AQUI POIS A MESMA VIOLA DIREITOS AUTORAIS" (Flamengo,
 *    Palmeiras, Internacional) e o pt.wikisource não tem letra de nenhum deles.
 *    Sem verificação de licença livre possível → **letra = null em todos**, com a
 *    nota de restrição (o operador exige: nunca publicar letra sem licença).
 *  - METADADOS (compositor/letrista/ano): fatos declarados pelas seções "Hino"
 *    dos artigos (CC BY-SA), curados explicitamente ABAIXO — cada linha deste
 *    arquivo é um fato copiado da fonte, com a URL. Campos duvidosos ficam null.
 *
 * O mapa abaixo é a curadoria (padrão T511: nada de busca aberta no apply).
 * Uso: node dist/scripts/seed-anthems.js [--apply]
 */
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const UA =
  'AlmanaqueDosClubes/0.1 (anthems seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

export interface AnthemEntry {
  composer: string | null;
  lyricist: string | null;
  year: number | null;
  official: boolean | null;
  label: string | null;
  note: string | null;
  audioUrl: string | null;
  audioLicense: string | null;
  audioSourceUrl: string | null;
  lyrics: null;
  lyricsSource: null;
  lyricsLicense: null;
  lyricsRestricted: true;
  sourceUrl: string;
  attribution: string;
}

const WIKI = (page: string) =>
  `https://pt.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`;
const ATTR = 'pt.Wikipédia (CC BY-SA 4.0)';

/** Curadoria: fatos literais das seções "Hino" (discovery 12-10-2026). */
export const ANTHEMS: Record<
  string,
  Omit<
    AnthemEntry,
    'lyricsRestricted' | 'lyrics' | 'lyricsSource' | 'lyricsLicense' | 'attribution'
  >
> = {
  'Fluminense F.C.': {
    composer: 'Antônio Cardoso de Menezes Filho',
    lyricist: 'Antônio Cardoso de Menezes Filho',
    year: 1916,
    official: true,
    label: 'Hino oficial (1916)',
    note: 'O primeiro hino (1915) tinha letra de Coelho Neto sobre a música de It’s a Long Way to Tipperary.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Fluminense Football Club'),
  },
  'Clube de Regatas do Flamengo': {
    composer: 'Paulo Magalhães',
    lyricist: 'Paulo Magalhães',
    year: 1920,
    official: true,
    label: 'Hymno Rubro-Negro',
    note: 'Gravado em 1932 por Castro Barbosa. O hino popular é de Lamartine Babo (1945).',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Clube de Regatas do Flamengo'),
  },
  'Sociedade Esportiva Palmeiras': {
    composer: 'Antonio Sergi',
    lyricist: null,
    year: 1949,
    official: true,
    label: 'Hino oficial (1949)',
    note: 'Sergi usava o pseudônimo Gennaro Rodrigues quando escrevia letras.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Sociedade Esportiva Palmeiras'),
  },
  'Club Athletico Paranaense': {
    composer: 'Genésio Ramalho',
    lyricist: 'Zinder Lins',
    year: null,
    official: null,
    label: 'Hino athleticano',
    note: 'Origem nas comemorações do bicampeonato invicto de 1929-30.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Club Athletico Paranaense'),
  },
  'S.C. Corinthians Paulista': {
    composer: 'Edmundo Russomanno',
    lyricist: "Lauro D'Ávila",
    year: 1952,
    official: true,
    label: 'Hino oficial (1952)',
    note: null,
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Sport Club Corinthians Paulista'),
  },
  'S.C. Internacional': {
    composer: 'Nélson Silva',
    lyricist: 'Nélson Silva',
    year: null,
    official: true,
    label: 'Celeiro de Ases',
    note: 'Vencedor de concurso do clube no final dos anos 1950.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Sport Club Internacional'),
  },
  'Fortaleza E.C.': {
    composer: 'Jackson de Carvalho',
    lyricist: 'Jackson de Carvalho',
    year: 1967,
    official: true,
    label: 'Hino oficial (1967)',
    note: 'O primeiro hino (1959) foi composto por José Jatahy.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Fortaleza Esporte Clube'),
  },
  'Grêmio FBPA': {
    composer: 'Lupicínio Rodrigues',
    lyricist: 'Lupicínio Rodrigues',
    year: 1953,
    official: true,
    label: 'Hino oficial (1953)',
    note: 'Hinos anteriores: Isolino Leal (1924) e Breno Blauth (1946).',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Grêmio Foot-Ball Porto Alegrense'),
  },
  'Botafogo F.R.': {
    composer: 'Lamartine Babo',
    lyricist: 'Lamartine Babo',
    year: 1942,
    official: false,
    label: 'Hino popular (não oficial)',
    note: 'O mais difundido, mas não é o hino oficial do clube.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Botafogo de Futebol e Regatas'),
  },
  'Esporte Clube Bahia': {
    composer: 'Adroaldo Ribeiro Costa',
    lyricist: 'Adroaldo Ribeiro Costa',
    year: null,
    official: null,
    label: 'Hino tricolor',
    note: 'Encomendado pela torcida na fundação do seu esquadrão (1946).',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Esporte Clube Bahia'),
  },
  'Santos F.C.': {
    composer: 'Mangeri Neto e Mangeri Sobrinho',
    lyricist: 'Mangeri Neto e Mangeri Sobrinho',
    year: 1955,
    official: null,
    label: 'Leão do Mar',
    note: 'Há controvérsia sobre qual é o hino oficial do clube.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Santos Futebol Clube'),
  },
  'Atlético-MG': {
    composer: 'Vicente Motta',
    lyricist: 'Vicente Motta',
    year: 1969,
    official: true,
    label: 'Hino oficial (1969)',
    note: 'O primeiro hino oficial (1928) tinha música de Augusto César Moreira e letra de Djalma Andrade.',
    audioUrl: null,
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: WIKI('Clube Atlético Mineiro'),
  },
  'São Paulo FC': {
    composer: null,
    lyricist: null,
    year: null,
    official: null,
    label: 'Hino (gravação de ~1977, Orquestra e Coro CID)',
    note: null,
    audioUrl: null, // preenchido após verificação ao vivo
    audioLicense: null,
    audioSourceUrl: null,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hino-do-S%C3%A3o-Paulo-FC.ogg',
  },
};

const SPFC_AUDIO_FILE = 'File:Hino-do-São-Paulo-FC.ogg';

/** JSON canônico (chaves ordenadas) — o jsonb não preserva a ordem. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

interface AudioInfo {
  url: string | null;
  license: string | null;
  deleted: boolean;
}

/** Verificação ao vivo do áudio no Commons (existe + licença + sem exclusão). */
export async function verifyAudio(fileTitle: string): Promise<AudioInfo | null> {
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      titles: fileTitle,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      format: 'json',
    });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              imageinfo?: Array<{ url?: string; extmetadata?: Record<string, { value?: string }> }>;
            }
          >;
        };
      };
      for (const p of Object.values(json.query?.pages ?? {})) {
        const ii = p.imageinfo?.[0];
        if (!ii) return { url: null, license: null, deleted: true };
        const em = ii.extmetadata ?? {};
        const clean = (k: string) =>
          em[k]?.value ? em[k].value.replace(/<[^>]+>/g, '').trim() : null;
        return {
          url: ii.url ?? null,
          license: clean('LicenseShortName'),
          deleted: Boolean(clean('DeletionReason')),
        };
      }
      return null;
    } catch {
      await new Promise<void>((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      club: { type: 'string' },
      apply: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
  const prisma = new PrismaClient();
  try {
    // áudio: verificação única, ao vivo
    const audio = await verifyAudio(SPFC_AUDIO_FILE);
    const audioUsable = Boolean(audio && !audio.deleted && audio.url && audio.license);
    console.log(
      `[áudio] ${SPFC_AUDIO_FILE}: ${audioUsable ? `OK (${audio!.license})` : 'INDISPONÍVEL'}`,
    );

    for (const [clubName, data] of Object.entries(ANTHEMS)) {
      if (values.club && values.club !== clubName) continue;
      const club = await prisma.club.findFirst({
        where: { name: clubName, deletedAt: null },
        select: { id: true, name: true, anthem: true },
      });
      if (!club) {
        console.log(`[${clubName}] clube não encontrado no acervo — gap`);
        continue;
      }
      const isSpfc = clubName === 'São Paulo FC';
      const entry: AnthemEntry = {
        ...(audioUsable && isSpfc
          ? {
              audioUrl: stripUtm(audio!.url as string),
              audioLicense: audio!.license as string,
              audioSourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(
                SPFC_AUDIO_FILE.replace(/ /g, '_'),
              )}`,
            }
          : { audioUrl: null, audioLicense: null, audioSourceUrl: null }),
        composer: data.composer,
        lyricist: data.lyricist,
        year: data.year,
        official: data.official,
        label: data.label,
        note: data.note,
        lyrics: null,
        lyricsSource: null,
        lyricsLicense: null,
        lyricsRestricted: true,
        sourceUrl: data.sourceUrl,
        attribution: ATTR,
      };
      const hash = createHash('sha256').update(canonicalJson(entry)).digest('hex');
      const currentHash = club.anthem
        ? createHash('sha256').update(canonicalJson(club.anthem)).digest('hex')
        : null;
      if (hash === currentHash) {
        console.log(`[${clubName}] já gravado idêntico — noop`);
        continue;
      }
      if (!APPLY) {
        console.log(
          `[${clubName}] ${data.label} · ${data.composer ?? '—'} (${data.year ?? '—'}) [dry-run]`,
        );
        continue;
      }
      await prisma.club.update({
        where: { id: club.id },
        data: { anthem: entry as unknown as Prisma.InputJsonValue },
      });
      console.log(`[${clubName}] gravado (anthem).`);
    }
    const total = await prisma.club.count({ where: { anthem: { not: Prisma.DbNull } } });
    console.log(`\nclubes com anthem: ${total}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

function stripUtm(url: string): string {
  return url
    .replace(/([?&])utm_[^&]*/g, '$1')
    .replace(/\?&/, '?')
    .replace(/&$/, '')
    .replace(/\?$/, '');
}

if (process.argv[1]?.includes('seed-anthems')) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, '[t524] falha no seed de hinos');
      process.exit(1);
    });
}
