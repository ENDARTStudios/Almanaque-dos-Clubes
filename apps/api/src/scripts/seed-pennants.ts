/**
 * T525 — Flâmulas dos clubes (gap explícito do Escopo 1).
 *
 * DESCOBERTA (12-10-2026, read-only): o Commons praticamente NÃO tem flâmulas
 * dos clubes do acervo. Busca em 22 clubes × 6 termos (pennant/flâmula/wimpel/
 * fanion/banner), categorias e arquivos: os hits são ruído (banners de cidade,
 * Wikivoyage, clubes homônimos). Só 2 arquivos são flâmulas reais de nossos
 * clubes, ambos verificados ao vivo (existe + licença + sem exclusão):
 *  - Bragantino: flâmula comemorativa do título da Segunda Divisão Paulista de
 *    1965 (CC BY-SA 4.0);
 *  - Arsenal: flâmula da final da FA Cup de 2001 (perdida para o Liverpool),
 *    hoje no museu do Anfield (CC BY 2.0).
 * **Meta 5+ clubes NÃO é atingível honestamente: gap declarado para os outros 20.**
 *
 * Curiosidades/descrições: SÓ o que a fonte (página do arquivo) declara. Uso:
 * node dist/scripts/seed-pennants.js [--apply]
 */
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const UA =
  'AlmanaqueDosClubes/0.1 (pennants seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

export interface PennantEntry {
  imageUrl: string;
  sourceUrl: string;
  license: string;
  description: string | null;
  year: number | null;
  type: 'official' | 'commemorative' | null;
  curiosities: string | null;
}

const WIKI = (page: string) =>
  `https://pt.wikipedia.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`;

/**
 * Curadoria explícita (padrão T511): cada entrada com a evidência da página do
 * arquivo. O imageUrl é resolvido AO VIVO (imageinfo) antes de gravar.
 */
export const PENNANTS: Record<
  string,
  Array<{
    file: string;
    description: string | null;
    year: number | null;
    type: PennantEntry['type'];
    curiosities: string | null;
    sourceUrl: string;
  }>
> = {
  'Red Bull Bragantino': [
    {
      file: 'File:Flamula-comemorativa-bragantino-1965.jpg',
      description: 'Flâmula comemorativa do título de Campeão Paulista da Segunda Divisão de 1965',
      year: 1965,
      type: 'commemorative',
      curiosities: 'Comemora o título paulista da segunda divisão conquistado em 1965.',
      sourceUrl: WIKI('Red Bull Bragantino'),
    },
  ],
  'Arsenal F.C.': [
    {
      file: 'File:Arsenal pennant 2001.jpg',
      description: 'Flâmula do Arsenal FC da final da FA Cup de 2001',
      year: 2001,
      type: 'commemorative',
      curiosities:
        'Da final da FA Cup 2001, perdida para o Liverpool; a peça está no museu do Anfield.',
      sourceUrl: WIKI('Arsenal F.C.'),
    },
  ],
};

interface ImageInfo {
  url: string | null;
  license: string | null;
  deleted: boolean;
  description: string | null;
}

function stripUtm(url: string): string {
  return url
    .replace(/([?&])utm_[^&]*/g, '$1')
    .replace(/\?&/, '?')
    .replace(/&$/, '')
    .replace(/\?$/, '');
}

async function verifyImage(fileTitle: string): Promise<ImageInfo | null> {
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
        if (!ii) return { url: null, license: null, deleted: true, description: null };
        const em = ii.extmetadata ?? {};
        const clean = (k: string) =>
          em[k]?.value ? em[k].value.replace(/<[^>]+>/g, '').trim() : null;
        return {
          url: ii.url ? stripUtm(ii.url) : null,
          license: clean('LicenseShortName'),
          deleted: Boolean(clean('DeletionReason')),
          description: clean('ImageDescription'),
        };
      }
      return null;
    } catch {
      await new Promise<void>((r) => setTimeout(r, 1500));
    }
  }
  return null;
}

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
    for (const [clubName, curated] of Object.entries(PENNANTS)) {
      if (values.club && values.club !== clubName) continue;
      const club = await prisma.club.findFirst({
        where: { name: clubName, deletedAt: null },
        select: { id: true, name: true, pennants: true },
      });
      if (!club) {
        console.log(`[${clubName}] clube não encontrado no acervo — gap`);
        continue;
      }
      const entries: PennantEntry[] = [];
      for (const item of curated) {
        const info = await verifyImage(item.file);
        if (!info || info.deleted || !info.url || !info.license) {
          console.log(`   fora: ${item.file} (sem licença/verificação)`);
          continue;
        }
        entries.push({
          imageUrl: info.url,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(
            item.file.replace(/ /g, '_'),
          )}`,
          license: info.license,
          description: item.description ?? info.description,
          year: item.year,
          type: item.type,
          curiosities: item.curiosities,
        });
      }
      console.log(`[${clubName}] flâmulas=${entries.length} [${APPLY ? 'apply' : 'dry-run'}]`);
      if (entries.length === 0) continue;
      const hash = createHash('sha256').update(canonicalJson(entries)).digest('hex');
      const currentHash = club.pennants
        ? createHash('sha256').update(canonicalJson(club.pennants)).digest('hex')
        : null;
      if (hash === currentHash) {
        console.log('   já gravado idêntico — noop');
        continue;
      }
      if (!APPLY) continue;
      await prisma.club.update({
        where: { id: club.id },
        data: { pennants: entries as unknown as Prisma.InputJsonValue },
      });
      console.log('   gravado (pennants).');
    }
    const total = await prisma.club.count({ where: { pennants: { not: Prisma.DbNull } } });
    console.log(`\nclubes com pennants: ${total}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-pennants')) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, '[t525] falha no seed de flâmulas');
      process.exit(1);
    });
}
