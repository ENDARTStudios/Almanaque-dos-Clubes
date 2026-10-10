/**
 * T512 — ingestão de CLUBES AUSENTES por QID (Wikidata CC0).
 *
 * Motivação (medida ao vivo no T510): o acervo NÃO tem Liverpool F.C., FC
 * Barcelona, Boca Juniors e outros clubes de elite — por isso temporadas já
 * gravadas ficaram com `championId`/`runnerUpId` = null (a regra do QID
 * resolvido do T510 recusa casar por nome aproximado, que é o certo).
 *
 * ⚠️ LIÇÃO T424 (6ª vez, agora em ESCALA): a lista de 20 QIDs recebida estava
 * **19/20 ERRADA** — Q113013 é "literatura pós-moderna", Q8776 é "Abraham de
 * Moivre", Q19629 é o ano "1147", Q49724 é a banda "Hoobastank", Q19648 é o
 * Fenerbahçe… Portanto os QIDs NÃO são digitados: são DERIVADOS do artigo da
 * Wikipédia (de onde os clubes faltantes apareceram) e VALIDADOS contra o
 * Wikidata antes de qualquer escrita.
 *
 * Interface: por PADRÃO usa a lista curada `TARGET_CLUBS` (lang + artigo) e
 * resolve o QID via `prop=pageprops`. `--qid=Q1,Q2` permite QIDs explícitos
 * (validados com a MESMA regra).
 *
 * Validação de "é clube de futebol" (cobre os formatos reais do Wikidata):
 *   P31 ∋ Q476028 (association football club)  OU  (P641 ∋ Q2736 ∧ P115 presente)
 *   E P17 (país) presente, com P297 (ISO-3166-1 alpha-2) resolvível.
 * Rejeita ligas, seleções, estádios e pessoas.
 *
 * Idempotência: nunca cria duplicata (dedup por QID); se existir clube vivo com
 * o MESMO nome e sem QID, ANEXA o QID e preenche só campos nulos (zero overwrite).
 *
 * Uso (produção, dentro do container):
 *   node dist/scripts/seed-clubs-by-qid.js                # DRY-RUN
 *   node dist/scripts/seed-clubs-by-qid.js --apply
 * Reversível por proveniência:
 *   DELETE FROM clubs WHERE "importedFrom"='wikidata-t512';
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { commonsFilePath } from '../modules/etl/connectors/wikidata-media.connector.js';
import { logger } from '../config/logger.js';

const UA =
  'AlmanaqueDosClubes/0.1 (clubs by qid; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** QIDs canônicos da validação (verificados ao vivo 10/10). */
export const QID_FOOTBALL_CLUB = 'Q476028';
export const QID_ASSOCIATION_FOOTBALL = 'Q2736';
export const PROP_SPORT = 'P641';
export const PROP_HOME_VENUE = 'P115';

/**
 * Lista curada: clube alvo → artigo da Wikipédia de origem. Os QIDs são
 * DERIVADOS destes artigos (nunca digitados: ver o aviso da lição T424).
 */
export const TARGET_CLUBS: Array<{ lang: 'en' | 'es' | 'pt'; article: string; note: string }> = [
  { lang: 'en', article: 'Liverpool F.C.', note: 'campeão Premier League 2024-25' },
  { lang: 'en', article: 'Leeds United F.C.', note: 'Premier League 2021-22/2022-23' },
  { lang: 'es', article: 'Fútbol Club Barcelona', note: 'campeão La Liga (várias temporadas)' },
  { lang: 'es', article: 'Girona Fútbol Club', note: 'La Liga' },
  { lang: 'es', article: 'Real Sociedad de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Villarreal Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Valencia Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Club Atlético Osasuna', note: 'La Liga' },
  { lang: 'es', article: 'Sevilla Fútbol Club', note: 'La Liga' },
  { lang: 'es', article: 'Unión Deportiva Las Palmas', note: 'La Liga' },
  { lang: 'es', article: 'Rayo Vallecano de Madrid', note: 'La Liga' },
  { lang: 'es', article: 'Cádiz Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Unión Deportiva Almería', note: 'La Liga' },
  { lang: 'es', article: 'Real Valladolid Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Club Deportivo Leganés', note: 'La Liga' },
  { lang: 'es', article: 'Real Oviedo', note: 'La Liga' },
  { lang: 'es', article: 'Elche Club de Fútbol', note: 'La Liga' },
  { lang: 'pt', article: 'Club Atlético Boca Juniors', note: 'vice Libertadores 2023' },
  { lang: 'pt', article: 'Club Atlético San Lorenzo de Almagro', note: 'Libertadores' },
  { lang: 'pt', article: 'Club Libertad', note: 'Libertadores' },
  { lang: 'pt', article: 'Club The Strongest', note: 'Libertadores' },
];

// ---------------------------------------------------------------------------
// Tipos/leitores do Wikidata (subconjunto usado)
// ---------------------------------------------------------------------------

interface Claim {
  mainsnak?: { datavalue?: { value?: unknown } };
}
interface Entity {
  missing?: boolean;
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  claims?: Record<string, Claim[]>;
}

/** Valores crus de uma propriedade. */
export function claimValues(entity: Entity, prop: string): unknown[] {
  return (entity.claims?.[prop] ?? [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v) => v !== undefined && v !== null);
}

/** IDs de entidade (ex.: P31 → ['Q476028']). */
export function claimIds(entity: Entity, prop: string): string[] {
  return claimValues(entity, prop)
    .map((v) =>
      typeof v === 'object' && v !== null && 'id' in v ? (v as { id?: string }).id : undefined,
    )
    .filter((x): x is string => !!x);
}

/** Valor textual (commonsMedia/string) — ex.: P18. */
function claimString(entity: Entity, prop: string): string | null {
  for (const v of claimValues(entity, prop)) if (typeof v === 'string') return v;
  return null;
}

/** Quantidade (ex.: P1083 capacidade) → inteiro. */
function claimAmount(entity: Entity, prop: string): number | null {
  for (const v of claimValues(entity, prop)) {
    if (typeof v === 'object' && v !== null && 'amount' in v) {
      const n = Number.parseInt(
        String((v as { amount?: string }).amount ?? '').replace(/[^\d]/g, ''),
        10,
      );
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Predicado PURO: a entidade é um CLUBE DE FUTEBOL?
 * Cobre os dois formatos reais (clube dedicado e clube poliesportivo — Barcelona,
 * Boca e San Lorenzo NÃO têm P31=Q476028, só P641=Q2736).
 */
export function isFootballClubEntity(entity: Entity): boolean {
  const p31 = claimIds(entity, 'P31');
  const sport = claimIds(entity, PROP_SPORT);
  const hasVenue = claimIds(entity, PROP_HOME_VENUE).length > 0;
  return p31.includes(QID_FOOTBALL_CLUB) || (sport.includes(QID_ASSOCIATION_FOOTBALL) && hasVenue);
}

/** Ano de fundação (P571), ou null. */
export function foundedYearOf(entity: Entity): number | null {
  for (const v of claimValues(entity, 'P571')) {
    if (typeof v === 'object' && v !== null && 'time' in v) {
      const m = /^[+-](\d{4})/.exec(String((v as { time?: string }).time ?? ''));
      if (m) return Number.parseInt(m[1], 10);
    }
  }
  return null;
}

/**
 * Nome no acervo: rótulo **pt** (o produto é PT-first e é a convenção dos clubes
 * sul-americanos já existentes), com fallback en/es.
 */
export function pickName(entity: Entity): string | null {
  for (const lang of ['pt', 'en', 'es']) {
    const v = entity.labels?.[lang]?.value?.trim();
    if (v) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------------

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Resolve artigos → QIDs (lotes por idioma, honrando normalized/redirects). */
async function resolveArticleQids(
  targets: Array<{ lang: string; article: string }>,
): Promise<Map<string, string>> {
  const byLang = new Map<string, string[]>();
  for (const t of targets) byLang.set(t.lang, [...(byLang.get(t.lang) ?? []), t.article]);
  const out = new Map<string, string>();
  for (const [lang, titles] of byLang) {
    const url =
      `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item` +
      `&titles=${encodeURIComponent(titles.join('|'))}&redirects=1&format=json&formatversion=2`;
    const json = (await fetchJson(url)) as {
      query?: {
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
        pages?: Array<{ title?: string; pageprops?: { wikibase_item?: string } }>;
      };
    };
    const norm = new Map((json.query?.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((json.query?.redirects ?? []).map((r) => [r.from, r.to]));
    const page = new Map(
      (json.query?.pages ?? []).map((p) => [p.title ?? '', p.pageprops?.wikibase_item]),
    );
    for (const t of titles) {
      const t1 = norm.get(t) ?? t;
      const t2 = redir.get(t1) ?? t1;
      const qid = page.get(t2) ?? page.get(t1) ?? page.get(t);
      if (qid) out.set(`${lang}|${t}`, qid);
    }
    await sleep(900);
  }
  return out;
}

async function fetchEntities(ids: string[]): Promise<Record<string, Entity>> {
  const out: Record<string, Entity> = {};
  for (let i = 0; i < ids.length; i += 45) {
    const url =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.slice(i, i + 45).join('|')}` +
      `&props=labels|descriptions|claims&languages=pt|en|es&format=json`;
    const json = (await fetchJson(url)) as { entities?: Record<string, Entity> };
    Object.assign(out, json.entities ?? {});
    await sleep(900);
  }
  return out;
}

/** ISO-3166-1 alpha-2 (P297) por QID de país. */
async function resolveCountryIso(qids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (qids.length === 0) return map;
  const json = (await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=claims&format=json`,
  )) as { entities?: Record<string, Entity> };
  for (const [qid, e] of Object.entries(json.entities ?? {})) {
    const iso = claimIds(e, 'P297')[0];
    if (iso) map.set(qid, iso.toUpperCase());
  }
  return map;
}

export interface Venue {
  name: string | null;
  capacity: number | null;
  image: string | null;
}

/** Estádio (P115): rótulo + capacidade (P1083) + imagem (P18 → Commons). */
async function resolveVenues(qids: string[]): Promise<Map<string, Venue>> {
  const map = new Map<string, Venue>();
  if (qids.length === 0) return map;
  const json = (await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}` +
      `&props=labels|claims&languages=pt|en|es&format=json`,
  )) as { entities?: Record<string, Entity> };
  for (const [qid, e] of Object.entries(json.entities ?? {})) {
    const image = claimString(e, 'P18');
    map.set(qid, {
      name: pickName(e),
      capacity: claimAmount(e, 'P1083'),
      image: image ? commonsFilePath(image) : null,
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { apply: { type: 'boolean', default: false }, qid: { type: 'string', default: '' } },
  });
  const APPLY_ON = values.apply || process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    // --- 1) alvos → QIDs (derivados do artigo, ou explícitos) ---
    let pairs: Array<{ qid: string; note: string; article?: string }>;
    if (values.qid) {
      pairs = values.qid.split(',').map((q) => ({ qid: q.trim(), note: 'qid explícito' }));
    } else {
      const map = await resolveArticleQids(TARGET_CLUBS);
      pairs = [];
      for (const t of TARGET_CLUBS) {
        const qid = map.get(`${t.lang}|${t.article}`);
        if (!qid) {
          console.log(`  ✗ não resolvi QID para ${t.lang}:${t.article} — pulado.`);
          continue;
        }
        pairs.push({ qid, note: t.note, article: `${t.lang}:${t.article}` });
      }
    }
    console.log(
      `[t512] alvos=${pairs.length} · modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'} · QIDs derivados`,
    );

    // --- 2) entidades + validação de "clube de futebol" ---
    const ents = await fetchEntities(pairs.map((p) => p.qid));
    const valid: Array<{ qid: string; note: string; article?: string; entity: Entity }> = [];
    for (const p of pairs) {
      const e = ents[p.qid];
      if (!e || e.missing) {
        console.log(`  ✗ ${p.qid} (${p.article ?? '—'}): não existe no Wikidata.`);
        continue;
      }
      const countryQid = claimIds(e, 'P17')[0];
      if (!isFootballClubEntity(e) || !countryQid) {
        console.log(
          `  ✗ ${p.qid} "${pickName(e) ?? '?'}": não é clube de futebol com país — RECUSADO.`,
        );
        continue;
      }
      valid.push({ ...p, entity: e });
    }

    // --- 3) país → ISO e estádio ---
    const countryIso = await resolveCountryIso([
      ...new Set(valid.map((v) => claimIds(v.entity, 'P17')[0]).filter(Boolean)),
    ]);
    const venues = await resolveVenues([
      ...new Set(valid.flatMap((v) => claimIds(v.entity, PROP_HOME_VENUE).slice(0, 1))),
    ]);

    // --- 4) dedup + diff (nunca cria duplicata) ---
    let created = 0;
    let attached = 0;
    let skipped = 0;
    for (const v of valid) {
      const name = pickName(v.entity);
      const iso = countryIso.get(claimIds(v.entity, 'P17')[0]) || null;
      const foundedYear = foundedYearOf(v.entity);
      const venueQid = claimIds(v.entity, PROP_HOME_VENUE)[0];
      const venue = venueQid ? venues.get(venueQid) : undefined;
      const logoFile = claimString(v.entity, 'P154');

      const existing = await prisma.club.findFirst({
        where: { qid: v.qid },
        select: { id: true, name: true, deletedAt: true },
      });
      if (existing) {
        console.log(
          `  = ${v.qid} "${existing.name}": já existe${existing.deletedAt ? ' (SOFT-DELETED)' : ''} — nada a fazer.`,
        );
        skipped += 1;
        continue;
      }

      const label =
        `${v.qid} "${name}" · ${iso ?? '?'} · fund=${foundedYear ?? '?'}` +
        ` · estádio=${venue?.name ?? '?'}${venue?.capacity ? ` (${venue.capacity})` : ''} · ${v.note}`;

      // mesmo nome e sem QID → ANEXA (evita duplicata)
      const sameName = name
        ? await prisma.club.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null, qid: null },
            select: { id: true, name: true },
          })
        : null;
      if (sameName) {
        console.log(`  ↗ ${label} → ANEXA qid a "${sameName.name}" (${sameName.id})`);
        if (APPLY_ON) {
          await prisma.club.update({
            where: { id: sameName.id },
            data: {
              qid: v.qid,
              ...(iso ? { country: iso } : {}), // preenche só o que está nulo
              ...(foundedYear ? { foundedYear } : {}),
              ...(venue?.name ? { stadiumName: venue.name } : {}),
            },
          });
        }
        attached += 1;
        continue;
      }

      console.log(`  + ${label}${logoFile ? ` · logo=${logoFile}` : ''}`);
      if (APPLY_ON) {
        await prisma.club.create({
          data: {
            name: name ?? v.qid,
            country: iso,
            foundedYear,
            qid: v.qid,
            gender: 'men',
            kind: 'club',
            logoUrl: logoFile ? commonsFilePath(logoFile) : null,
            stadiumName: venue?.name ?? null,
            stadiumCapacity: venue?.capacity ?? null,
            stadiumImage: venue?.image ?? null,
            importedFrom: 'wikidata-t512',
            importedAt: new Date(),
            sourceUrl: `https://www.wikidata.org/wiki/${v.qid}`,
          },
        });
      }
      created += 1;
    }

    console.log(
      `[t512] fim: ${APPLY_ON ? 'criados' : 'criaria'}=${created} · anexaria=${attached} · já-existiam=${skipped}`,
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-clubs-by-qid')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error(
        { err: String(err).slice(0, 200) },
        '[t512] falha na ingestão de clubes por QID',
      );
      process.exit(1);
    });
}
