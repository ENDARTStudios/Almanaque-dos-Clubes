/**
 * T531 — CURA DO GENDER no acervo.
 *
 * Contexto: o T529 achou partidas ligadas a clubes FEMININOS em ligas masculinas
 * porque dezenas de entidades femininas estão gravadas com `gender='men'` no acervo
 * (defeito de ingest). Exemplo real: "Peñarol women's" (Q107597376) passou no filtro
 * de gênero do resolver e recebeu 32 partidas da Libertadores.
 *
 * Como decide (nada por semelhança de nome sozinha):
 *   1. Wikidata P21 = female (Q6581072)  -> corrige  (`wikidata_p21_female`)
 *   2. Wikidata P21 = male   (Q6581097)  -> NÃO corrige (`wikidata_p21_male`: o nome
 *      engana, o dado manda) — é o contador de FALSOS CANDIDATOS do relatório
 *   3. P21 ausente/outro                 -> corrige só se o PRÓPRIO NOME declara
 *      feminino (`name_declares_female`: feminino/feminina/women/female/femenino/
 *      femminile/femenil/damen/frauen/vrouwen/kobiety/…)
 *   4. resto                             -> fora (`sem_fonte`)
 *
 * Duas descobertas, ambas usadas por padrão:
 *   - por NOME: entidades com marcador feminino no nome e `gender='men'` (rápido);
 *   - VARREDURA COMPLETA: todos os clubes `gender='men'` com QID, verificados por
 *     P21 em lotes de 50 (~230 requisições para 11,5 mil) — pega o que o nome não diz.
 *
 * Escrita: só o campo `gender` (+ proveniência em `metadata.genderCure`), só onde
 * ainda está 'men' (idempotente: o re-run não tem o que corrigir). Dry-run por padrão.
 *
 *   node dist/scripts/cure-gender-t531.js              # dry-run
 *   node dist/scripts/cure-gender-t531.js --apply
 *   node dist/scripts/cure-gender-t531.js --apply --name-only
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { parseArgs } from 'node:util';
import { fetchEntities } from '../lib/wikidata/wikidata-client.js';
import { logger } from '../config/logger.js';

const FEMALE = 'Q6581072';
const MALE = 'Q6581097';

/** Marcadores femininos no nome (o MESMO critério da discovery por nome). */
const FEMININE_MARKERS = [
  'feminino',
  'feminina',
  'feminine',
  'féminin',
  'femenino',
  'femenina',
  'femenil',
  'femminile',
  'women',
  'female',
  'damen',
  'frauen',
  'vrouwen',
  'kobiety',
  'femmes',
] as const;

export type GenderVerdict =
  | 'wikidata_p21_female'
  | 'wikidata_p31_womens'
  | 'name_declares_female'
  | 'wikidata_p21_male'
  | 'wikidata_p31_mens'
  | 'sem_fonte';

/** PURO — o nome declara feminino? (marcador como palavra, não substring solta). */
export function nameDeclaresFemale(name: string): boolean {
  const norm = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return FEMININE_MARKERS.some((m) => new RegExp(`(^|[^a-z])${m}([^a-z]|$)`).test(norm));
}

/**
 * PURO — o rótulo de uma CLASSE P31 declara feminino/masculino?
 *
 * Por que P31 e não P21: P21 ("sex or gender") só existe em PESSOAS — times e clubes
 * não carregam P21 (medido: a seleção feminina da Albânia, Q934030, tem P21 vazio).
 * O que o Wikidata usa para dizer "time/clube feminino" é o P31 — medido em
 * Q23905105 ("women's national association football team") e Q51481377 ("women's
 * association football club"). Então a verificação na fonte é pelo RÓTULO da classe.
 */
export function classDeclares(label: string): 'female' | 'male' | null {
  const norm = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (
    /(^|[^a-z])(women|female|feminin|femenin|femminile|femenil|damen|frauen|vrouwen|kobiety|femmes)([^a-z]|$)/.test(
      norm,
    )
  ) {
    return 'female';
  }
  if (/(^|[^a-z])(men|male|masculin|maschile|heren|mannen)([^a-z]|$)/.test(norm)) return 'male';
  return null;
}

/** PURO — ids das classes P31 da entidade. */
export function p31IdsOf(entity: {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
}): string[] {
  return (entity.claims?.P31 ?? [])
    .map((c) => {
      const v = c.mainsnak?.datavalue?.value;
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object' && 'id' in v) {
        const id = (v as { id?: unknown }).id;
        return typeof id === 'string' ? id : null;
      }
      return null;
    })
    .filter((x): x is string => x != null);
}

/** PURO — veredito a partir do P21, das classes P31 e do nome. */
export function genderVerdict(
  p21: string | null,
  name: string,
  p31Verdicts: Array<'female' | 'male' | null> = [],
): GenderVerdict {
  if (p21 === FEMALE) return 'wikidata_p21_female';
  if (p21 === MALE) return 'wikidata_p21_male';
  // Classe P31 dizendo "feminino" é a evidência mais forte para time/clube.
  if (p31Verdicts.includes('female')) return 'wikidata_p31_womens';
  // Nome engana: a classe diz MASCULINO -> não toca (falso candidato).
  if (p31Verdicts.includes('male')) return 'wikidata_p31_mens';
  return nameDeclaresFemale(name) ? 'name_declares_female' : 'sem_fonte';
}

/** PURO — lê o P21 (sex or gender) da entidade Wikidata. */
export function p21Of(entity: {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
}): string | null {
  const claim = entity.claims?.P21?.[0]?.mainsnak?.datavalue?.value;
  if (typeof claim === 'string') return claim;
  if (claim && typeof claim === 'object' && 'id' in claim) {
    const id = (claim as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

export interface CureReport {
  candidates: number;
  corrected: number;
  byVerdict: Record<GenderVerdict, number>;
  /** Nome engana: o Wikidata diz MASCULINO — falso candidato, não tocado. */
  falseCandidates: Array<{ name: string; qid: string | null }>;
  skippedNoSource: number;
  semQid: number;
}

export async function cureGender(
  opts: { apply: boolean; nameOnly?: boolean; prisma?: PrismaClient } = { apply: false },
): Promise<CureReport> {
  const prisma = opts.prisma ?? new PrismaClient();
  const own = !opts.prisma;
  const report: CureReport = {
    candidates: 0,
    corrected: 0,
    byVerdict: {
      wikidata_p21_female: 0,
      wikidata_p31_womens: 0,
      name_declares_female: 0,
      wikidata_p21_male: 0,
      wikidata_p31_mens: 0,
      sem_fonte: 0,
    },
    falseCandidates: [],
    skippedNoSource: 0,
    semQid: 0,
  };
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  try {
    // Descoberta. Sem `--name-only`, o universo é TODO clube `men` com QID (a
    // varredura por P21 é o que pega o defeito que o nome não denuncia).
    const rows = await prisma.club.findMany({
      where: {
        deletedAt: null,
        gender: 'men',
        ...(opts.nameOnly
          ? {
              OR: FEMININE_MARKERS.map((m) => ({ name: { contains: m, mode: 'insensitive' } })),
            }
          : {}),
      },
      select: { id: true, name: true, qid: true, metadata: true },
      orderBy: { name: 'asc' },
    });
    report.candidates = rows.length;
    const withQid = rows.filter((r) => r.qid != null);
    report.semQid = rows.length - withQid.length;

    // Verificação P21 em lotes de 50.
    const entities = await fetchEntities(withQid.map((r) => r.qid!) as string[], { sleep });

    // 2ª rodada: RÓTULOS das classes P31 — é o rótulo que diz "women's ... club/team".
    const classIds = new Set<string>();
    for (const e of entities.values()) {
      if (e) for (const id of p31IdsOf(e)) classIds.add(id);
    }
    const classEntities = await fetchEntities([...classIds], { sleep });
    const classVerdict = new Map<string, 'female' | 'male' | null>();
    for (const [qid, e] of classEntities) {
      const labels = [e?.labels?.pt?.value, e?.labels?.en?.value].filter(
        (x): x is string => typeof x === 'string',
      );
      classVerdict.set(qid, labels.map(classDeclares).find((v) => v != null) ?? null);
    }

    const toFix: Array<{
      id: string;
      name: string;
      qid: string | null;
      verdict: GenderVerdict;
      p21: string | null;
    }> = [];
    for (const row of withQid) {
      const entity = entities.get(row.qid!) ?? null;
      const p21 = entity ? p21Of(entity) : null;
      const p31Verdicts = entity ? p31IdsOf(entity).map((id) => classVerdict.get(id) ?? null) : [];
      const verdict = genderVerdict(p21, row.name, p31Verdicts);
      report.byVerdict[verdict] += 1;
      if (verdict === 'wikidata_p21_male' || verdict === 'wikidata_p31_mens') {
        report.falseCandidates.push({ name: row.name, qid: row.qid });
        continue;
      }
      if (verdict === 'sem_fonte') {
        report.skippedNoSource += 1;
        continue;
      }
      toFix.push({ id: row.id, name: row.name, qid: row.qid, verdict, p21 });
    }

    console.log(
      `cure-gender: candidatos=${report.candidates} (sem_qid=${report.semQid}) ` +
        `| a_corrigir=${toFix.length} | falsos_candidatos(P21=masculino)=${report.byVerdict.wikidata_p21_male} ` +
        `| sem_fonte=${report.skippedNoSource} | modo=${opts.apply ? 'apply' : 'dry-run'}`,
    );
    console.log(`   por veredito: ${JSON.stringify(report.byVerdict)}`);

    if (!opts.apply) {
      for (const f of toFix.slice(0, 15)) {
        console.log(`   [dry] ${f.name} | ${f.qid ?? '(sem qid)'} | ${f.verdict}`);
      }
      return report;
    }

    const at = new Date().toISOString();
    for (const fix of toFix) {
      const current = await prisma.club.findUnique({
        where: { id: fix.id },
        select: { metadata: true },
      });
      const meta = (current?.metadata ?? null) as Record<string, unknown> | null;
      await prisma.club.update({
        where: { id: fix.id },
        data: {
          gender: 'women',
          metadata: {
            ...(meta ?? {}),
            genderCure: {
              at,
              from: 'men',
              to: 'women',
              rule: fix.verdict,
              p21: fix.p21,
              sourceUrl: fix.qid ? `https://www.wikidata.org/wiki/${fix.qid}` : null,
              task: 'T531',
            },
          } as Prisma.InputJsonValue,
        },
      });
      report.corrected += 1;
    }
    console.log(`   corrigidas: ${report.corrected}`);
    return report;
  } finally {
    if (own) await prisma.$disconnect();
  }
}

export async function run(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      apply: { type: 'boolean', default: false },
      'name-only': { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
  try {
    const out = await cureGender({ apply: values.apply, nameOnly: values['name-only'] });
    logger.info({ ...out, apply: values.apply }, 'cure-gender: fim');
    return 0;
  } catch (err) {
    logger.error({ err: String(err).slice(0, 300) }, 'cure-gender: falha');
    return 1;
  }
}

if (process.argv[1]?.includes('cure-gender-t531')) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
