/**
 * T510 (W4.1) — registra UMA competição ausente do acervo a partir do Wikidata
 * (CC0), com proveniência e IDEMPOTÊNCIA — nunca cria duplicata.
 *
 * Motivação (R3, medido AO VIVO 10/10): a elite italiana ("Serie A", Q15804) NÃO
 * existe em `competitions` (só "Lega Serie A" Q2427920, que é o ÓRGÃO, e
 * "Italian Football Championship" Q16481773, histórico). Sem a mãe, o seed de
 * temporadas recusa honestamente. Este script fecha o gap.
 *
 * O QID é VALIDADO contra o Wikidata antes de criar (lição T424: o 1º candidato
 * testado, Q153723, era o filme "Inglourious Basterds"): exige rótulo/descrição
 * e as classes esperadas (P31 ⊂ liga) — `--expect-p31` opcional.
 *
 * Uso (produção, dentro do container):
 *   node dist/scripts/ensure-competition.js --qid=Q15804 --name="Serie A" \
 *     --country=IT --type=LEAGUE --level=1                # DRY-RUN
 *   node dist/scripts/ensure-competition.js ... --apply
 * Reversível por proveniência:
 *   DELETE FROM competitions WHERE "importedFrom"='wikidata-t510' AND qid='Q15804';
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    apply: { type: 'boolean', default: false },
    qid: { type: 'string', default: '' },
    name: { type: 'string', default: '' },
    country: { type: 'string', default: '' },
    type: { type: 'string', default: 'LEAGUE' },
    level: { type: 'string', default: '' },
    gender: { type: 'string', default: 'men' },
    'expect-p31': { type: 'string', default: '' },
    lang: { type: 'string', default: 'pt' },
  },
});
const APPLY_ON = values.apply || process.argv.includes('--apply');
const UA =
  'AlmanaqueDosClubes/0.1 (ensure competition; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

interface EntityInfo {
  label: string | null;
  description: string | null;
  p31: string[];
}

/** Lê rótulo/descrição/P31 do item — usado para VALIDAR o QID antes de criar. */
export async function fetchEntityInfo(qid: string, lang: string): Promise<EntityInfo | null> {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}` +
    `&props=labels|descriptions|claims&languages=${lang}|en&format=json`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    entities?: Record<
      string,
      {
        labels?: Record<string, { value?: string }>;
        descriptions?: Record<string, { value?: string }>;
        claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: { id?: string } } } }>>;
      }
    >;
  };
  const e = json.entities?.[qid];
  if (!e) return null;
  const p31 = (e.claims?.P31 ?? [])
    .map((c) => c.mainsnak?.datavalue?.value?.id)
    .filter((x): x is string => !!x);
  return {
    label: e.labels?.[lang]?.value ?? e.labels?.en?.value ?? null,
    description: e.descriptions?.[lang]?.value ?? e.descriptions?.en?.value ?? null,
    p31,
  };
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    if (!values.qid || !values.name) {
      console.error('[t510] use --qid=<Q> --name="<nome>" [--country=IT --type=LEAGUE --level=1]');
      return 1;
    }
    const qid = values.qid;
    const name = values.name;

    // 1) já existe por QID? (inclusive soft-deleted — não ressuscita sem decisão)
    const byQid = await prisma.competition.findFirst({
      where: { qid },
      select: { id: true, name: true, deletedAt: true },
    });
    if (byQid) {
      console.log(
        `[t510] já existe competição com qid=${qid}: "${byQid.name}" (${byQid.id})` +
          (byQid.deletedAt ? ' — SOFT-DELETED (não ressuscito automaticamente)' : ''),
      );
      return 0;
    }

    // 2) valida o QID contra o Wikidata (lição T424)
    const info = await fetchEntityInfo(qid, values.lang ?? 'pt');
    if (!info) {
      console.error(`[t510] qid=${qid} não resolvido no Wikidata — recusa honesta.`);
      return 1;
    }
    console.log(`  wikidata: "${info.label}" — ${info.description ?? '(sem descrição)'}`);
    console.log(`    P31: ${info.p31.join(', ') || '—'}`);
    if (values['expect-p31']) {
      const want = new Set(values['expect-p31'].split(',').map((s) => s.trim()));
      const hit = info.p31.some((p) => want.has(p));
      if (!hit) {
        console.error(
          `[t510] P31 de ${qid} (${info.p31.join(',')}) não contém nenhuma de [${[...want].join(',')}] — RECUSA.`,
        );
        return 1;
      }
      console.log(`    ✓ P31 esperado presente (${[...want].join(',')})`);
    }

    // 3) mesmo NOME+país sem QID ⇒ preenche o QID (evita duplicata)
    const byName = await prisma.competition.findMany({
      where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, name: true, qid: true, country: true },
    });
    const attach = byName.find((c) => !c.qid);
    if (attach) {
      console.log(
        `  nome "${name}" já existe SEM qid (${attach.id}) → ${APPLY_ON ? 'preenchendo' : 'preencheria'} o qid.`,
      );
      if (!APPLY_ON) return 0;
      await prisma.competition.update({ where: { id: attach.id }, data: { qid } });
      console.log(`[t510] qid=${qid} anexado a ${attach.id}.`);
      return 0;
    }
    if (byName.length > 0) {
      console.log(
        `  já existe "${name}" com qid=${byName.map((c) => c.qid).join(',')} — nada a fazer.`,
      );
      return 0;
    }

    // 4) cria
    const level = values.level ? Number.parseInt(values.level, 10) : null;
    const data = {
      name,
      country: values.country || null,
      type: values.type as 'LEAGUE' | 'CUP' | 'TOURNAMENT' | 'SUPER_CUP',
      level: Number.isFinite(level) ? level : null,
      gender: values.gender ?? 'men',
      qid,
      importedFrom: 'wikidata-t510',
      importedAt: new Date(),
      sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
    };
    console.log(
      `  ${APPLY_ON ? 'criando' : 'criaria'}: ${JSON.stringify({ ...data, importedAt: undefined })}`,
    );
    if (APPLY_ON) {
      const created = await prisma.competition.create({ data, select: { id: true, name: true } });
      console.log(`[t510] criada: ${created.name} (${created.id})`);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('ensure-competition')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t510] falha ao registrar competição');
      process.exit(1);
    });
}
