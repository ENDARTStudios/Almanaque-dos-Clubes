/**
 * T526 — Modelo 3D do troféu (visualizador 360º).
 *
 * RESULTADO DA BUSCA (12-10-2026, documentada — 3 rodadas, leia o worklog):
 * **ZERO modelos 3D publicáveis.** O Commons hospeda apenas `.stl` (não glb/gltf,
 * os formatos WebGL-friendly) e os únicos STLs de futebol são GENÉRICOS
 * (`Fußball 20230523 001.stl` = bola escaneada; `Soccer ball.stl`; troféu da
 * Wikipédia; ícone do 3dicons.co; asset do SuperTuxKart) — NENHUM troféu real das
 * 19 competições do acervo, NENHUMA bola oficial identificada. Publicar um STL
 * genérico como "troféu da Libertadores" seria inventar.
 *
 * Por isso o mapa abaixo está VAZIO: o pipeline existe e está pronto — quando o
 * primeiro modelo real aparecer (ou for doado com licença livre), basta adicionar
 * a entrada curada aqui com a mesma verificação ao vivo que os demais seeds usam.
 * Enquanto isso: fallback = `trophyImageUrl` (imagem estática, já em produção).
 *
 * Uso: node dist/scripts/seed-trophy-models.js [--apply]
 */
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const UA =
  'AlmanaqueDosClubes/0.1 (trophy-models seed; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

export interface TrophyModelEntry {
  modelUrl: string;
  sourceUrl: string;
  license: string;
  format: 'stl' | 'glb' | 'gltf';
  description: string | null;
}

/**
 * Curadoria: VAZIA por falta de fonte (ver cabeçalho). Formato aceito pelo
 * Commons = .stl apenas. Para adicionar o primeiro modelo real:
 *   'Copa Libertadores': { file: 'File:X.stl', format: 'stl', description: null }
 */
export const TROPHY_MODELS: Record<
  string,
  Array<{ file: string; format: TrophyModelEntry['format']; description: string | null }>
> = {};

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

async function verifyFile(fileTitle: string): Promise<{
  url: string | null;
  license: string | null;
  deleted: boolean;
} | null> {
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
  parseArgs({
    args: argv,
    options: { apply: { type: 'boolean', default: false } },
    allowPositionals: true,
  });
  const prisma = new PrismaClient();
  try {
    const totalCurated = Object.values(TROPHY_MODELS).reduce((n, arr) => n + arr.length, 0);
    console.log(
      `[t526] modelos curados: ${totalCurated} — a busca de 12-10-2026 (3 rodadas, categorias + tipos + nomes específicos) não encontrou NENHUM modelo 3D de troféu real ou bola oficial das competições do acervo. Gap declarado; fallback = trophyImageUrl (imagem estática, em produção).`,
    );
    if (totalCurated === 0) return 0;

    for (const [competitionQid, models] of Object.entries(TROPHY_MODELS)) {
      const comp = await prisma.competition.findFirst({
        where: { qid: competitionQid, deletedAt: null },
        select: { id: true, name: true, trophyModel: true },
      });
      if (!comp) {
        console.log(`[${competitionQid}] competição ausente no acervo`);
        continue;
      }
      const entries: TrophyModelEntry[] = [];
      for (const item of models) {
        const info = await verifyFile(item.file);
        if (!info || info.deleted || !info.url || !info.license) {
          console.log(`   fora: ${item.file} (sem licença/verificação)`);
          continue;
        }
        entries.push({
          modelUrl: info.url.replace(/([?&])utm_[^&]*/g, '$1'),
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(
            item.file.replace(/ /g, '_'),
          )}`,
          license: info.license,
          format: item.format,
          description: item.description,
        });
      }
      if (entries.length === 0) continue;
      const hash = createHash('sha256').update(canonicalJson(entries)).digest('hex');
      const currentHash = comp.trophyModel
        ? createHash('sha256').update(canonicalJson(comp.trophyModel)).digest('hex')
        : null;
      if (hash === currentHash) {
        console.log(`[${comp.name}] já gravado idêntico — noop`);
        continue;
      }
      if (!APPLY) {
        console.log(`[${comp.name}] ${entries.length} modelo(s) [dry-run]`);
        continue;
      }
      await prisma.competition.update({
        where: { id: comp.id },
        data: { trophyModel: entries as unknown as Prisma.InputJsonValue },
      });
      console.log(`[${comp.name}] gravado (trophyModel).`);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-trophy-models')) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, '[t526] falha no seed de modelos 3D');
      process.exit(1);
    });
}
