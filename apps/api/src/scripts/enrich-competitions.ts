/**
 * T-24/25 — enriquecimento de COMPETIÇÕES e ESTADOS via Wikidata (CC0).
 *
 * Fonte: Wikidata `action=wbgetentities` (dados CC0), `props=claims|descriptions`
 * com `languages=pt|en|es` (a API já filtra os 3 idiomas — validado por probe real
 * D-2026-10-17 em Q206813 = Campeonato Brasileiro Série A e Q119158 = DF):
 *   descriptions pt/en/es → `competitions.description` {pt,en,es,sourceUrl,at}
 *   P571 inception → `inceptionYear` (precisão ≥ 9 = ano ou melhor; faixa 1850..atual+1)
 *   P576 dissolved → `dissolvedAt` (precisão 11 = dia; 9 = ano → 1º de jan; < 1850 = descarta)
 *
 * PASSADA 2 (`--states`) — bandeira dos ESTADOS (`states.flagUrl`):
 *   PROBE REAL: P163 ("flag image") NÃO aponta para um arquivo do Commons — aponta
 *   para um ITEM (ex.: DF Q119158 → Q2329426 "bandeira do Distrito Federal, Brasil"),
 *   e o ARQUIVO vem do P18 desse item ("Bandeira do Distrito Federal (Brasil).svg").
 *   Caminho implementado: P163 (item) → P18 do item → `commonsFilePath()` — o MESMO
 *   pipeline determinístico do trophyImageUrl (T509/T506). Estado sem P163 ou item
 *   sem P18 = gap declarado (flagUrl segue NULL).
 *
 * Regras (idempotent-seed, à risca):
 *   - ZERO OVERWRITE: description/inceptionYear/dissolvedAt/flagUrl só preenchem NULL;
 *   - fila por cursor: passada 1 só pega `competitionEnrichment IS NULL` (registro
 *     ausente = nunca tentado, padrão profileEnrichment T-22.3) → re-run = noop;
 *   - passada 2: State NÃO tem coluna de cursor (mesma limitação declarada do
 *     harvestTrophiesBatch) — a fila é `flagUrl IS NULL`: os sucessos saem da fila,
 *     os "sem bandeira" voltam na próxima passada;
 *   - guards de plausibilidade: ano 1850..atual+1; precision menor que a aceita =
 *     descarta (nunca fabricar dia/mês);
 *   - seasons primeiro na fila (competição com edições catalogadas é mais valiosa).
 *
 * Como reverter (reversível por proveniência — a fonte é sempre o QID da própria linha):
 *   UPDATE competitions SET description=NULL, "inceptionYear"=NULL,
 *     "dissolvedAt"=NULL, "competitionEnrichment"=NULL
 *     WHERE "competitionEnrichment" IS NOT NULL;
 *   UPDATE states SET "flagUrl"=NULL WHERE "flagUrl" IS NOT NULL AND qid IS NOT NULL;
 *
 * Uso (local, Postgres de dev em infra/):
 *   npx tsx scripts/enrich-competitions.ts                        # DRY-RUN verboso
 *   npx tsx scripts/enrich-competitions.ts --apply --limit=200
 *   npx tsx scripts/enrich-competitions.ts --apply --ids=<uuid1,uuid2>
 *   npx tsx scripts/enrich-competitions.ts --apply --states       # passada 2
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { fetchWithRetry } from '../lib/http-resilience.js';
import { commonsFilePath } from '../modules/etl/connectors/wikidata-media.connector.js';
import { yearFromWikidataTime } from './enrich-player-profiles.js';

const UA = 'AlmanaqueDosClubes-EnrichCompetitions/1.0 (+https://almanaquedosclubes.com)';
const ENTITY_URL = (qids: string[], props: string) =>
  `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}` +
  `&props=${props}&languages=pt|en|es&format=json`;
const CHUNK_SIZE = 50;
const PAUSE_MS = 500;
const WIKIDATA_ENTITY_URL_BASE = 'https://www.wikidata.org/wiki/';

const APPLY = process.argv.includes('--apply');
const STATES = process.argv.includes('--states');
const LIMIT = Number(
  (process.argv.find((a) => a.startsWith('--limit=')) ?? '--limit=200').split('=')[1],
);
const IDS = (process.argv.find((a) => a.startsWith('--ids=')) ?? '--ids=')
  .split('=')[1]
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Extração pura (exportada para teste)
// ---------------------------------------------------------------------------
/** Shape mínimo de wbgetentities usado pelos extratores (claims + descriptions). */
interface EntityLike {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
  descriptions?: Record<string, { language: string; value: string }>;
}

export type CompetitionDescriptionLang = 'pt' | 'en' | 'es';

/** descriptions pt/en/es não-vazias (trim); vazio/ausente = chave fora do objeto. */
export function extractDescriptions(
  entity: unknown,
): Partial<Record<CompetitionDescriptionLang, string>> {
  const out: Partial<Record<CompetitionDescriptionLang, string>> = {};
  const descriptions =
    (entity as { descriptions?: Record<string, { value?: unknown }> | undefined })?.descriptions ??
    {};
  for (const lang of ['pt', 'en', 'es'] as const) {
    const value = descriptions[lang]?.value;
    if (typeof value === 'string' && value.trim()) out[lang] = value.trim();
  }
  return out;
}

/** P571 → ano de criação; SÓ com precisão ≥ 9 (ano ou melhor) e na faixa 1850..atual+1. */
export function extractInceptionYear(entity: unknown): number | null {
  const st = (entity as EntityLike)?.claims?.P571?.[0];
  const value = st?.mainsnak?.datavalue?.value as
    { time?: unknown; precision?: unknown } | undefined;
  if (typeof value?.time !== 'string') return null;
  if (typeof value.precision !== 'number' || value.precision < 9) return null;
  return yearFromWikidataTime(value.time); // já aplica a faixa 1850..atual+1
}

/** P576 → data de extinção; precisão 11 = dia exato, 9 = ano → 1º de jan; < 1850 = descarta. */
export function extractDissolvedAt(entity: unknown): Date | null {
  const st = (entity as EntityLike)?.claims?.P576?.[0];
  const value = st?.mainsnak?.datavalue?.value as
    { time?: unknown; precision?: unknown } | undefined;
  if (typeof value?.time !== 'string') return null;
  const year = yearFromWikidataTime(value.time);
  if (year == null) return null;
  if (value.precision === 11) {
    const m = /^\+(\d{4}-\d{2}-\d{2})T/.exec(value.time);
    if (!m) return null;
    const d = new Date(`${m[1]}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (value.precision === 9) return new Date(Date.UTC(year, 0, 1));
  return null; // precisão 10 (mês), 8 (década)… = gap declarado
}

/** P163 ("flag image") → QID do ITEM da bandeira (NÃO é um arquivo — probe D-2026-10-17). */
export function extractFlagItemQid(entity: unknown): string | null {
  const st = (entity as EntityLike)?.claims?.P163?.[0];
  const value = st?.mainsnak?.datavalue?.value as { id?: unknown } | undefined;
  return typeof value?.id === 'string' && /^Q\d+$/.test(value.id) ? value.id : null;
}

/** P18 do item de bandeira → nome do ARQUIVO no Commons (string). */
export function extractFlagFileFromItem(item: unknown): string | null {
  const st = (item as EntityLike)?.claims?.P18?.[0];
  const value = st?.mainsnak?.datavalue?.value;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Nome de arquivo do Commons → URL direta determinística (MESMO pipeline do T509). */
export function flagUrlFromFile(file: string): string {
  return commonsFilePath(file.replace(/^File\s*:/i, ''));
}

// ---------------------------------------------------------------------------
// Fetch chunkado de entidades (50 QIDs por chamada, backoff T448)
// ---------------------------------------------------------------------------
function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchEntitiesChunked(
  qids: string[],
  props: 'claims|descriptions' | 'claims',
): Promise<Map<string, EntityLike>> {
  const out = new Map<string, EntityLike>();
  for (const part of chunked([...new Set(qids)], CHUNK_SIZE)) {
    try {
      const res = await fetchWithRetry(
        ENTITY_URL(part, props),
        { headers: { 'user-agent': UA, Accept: 'application/json' } },
        { label: 'enrich-competitions' },
      );
      const json = (await res.json()) as { entities?: Record<string, EntityLike> };
      for (const [qid, ent] of Object.entries(json.entities ?? {})) out.set(qid, ent);
    } catch (err) {
      // Falha ruidosa do CHUNK: os QIDs dele ficam sem dado (contam como erro no
      // resumo); o lote continua. A fonte é o próprio QID da linha — sempre re-tentável.
      console.error(`  chunk (${part.length} QIDs) falhou: ${(err as Error).message.slice(0, 90)}`);
    }
    await sleep(PAUSE_MS);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
interface CompetitionRow {
  id: string;
  qid: string;
  name: string;
  description: unknown;
  inceptionYear: number | null;
  dissolvedAt: Date | null;
}

interface StateRow {
  id: string;
  qid: string;
  name: string;
  flagUrl: string | null;
}

async function enrichCompetitions(prisma: PrismaClient): Promise<void> {
  // Fila: qid != null e NUNCA tentado (`competitionEnrichment` ausente) — com
  // temporadas catalogadas primeiro, depois nome. Sem ORDER BY não há fila
  // determinística (lição T448/#448).
  let competitions: CompetitionRow[];
  if (IDS.length > 0) {
    // Modo explícito (--ids): re-tenta os pedidos, ignorando o cursor.
    competitions = (await prisma.competition.findMany({
      where: { id: { in: IDS }, qid: { not: null }, deletedAt: null },
      select: {
        id: true,
        qid: true,
        name: true,
        description: true,
        inceptionYear: true,
        dissolvedAt: true,
      },
      orderBy: { name: 'asc' },
    })) as CompetitionRow[];
    const semQid = IDS.length - competitions.length;
    if (semQid > 0) console.log(`  ${semQid} id(s) sem qid no acervo — ignorados`);
  } else {
    competitions = (await prisma.$queryRawUnsafe(
      `SELECT c.id, c.qid, c.name, c.description, c."inceptionYear", c."dissolvedAt"
         FROM competitions c
        WHERE c.qid IS NOT NULL AND c."competitionEnrichment" IS NULL AND c."deletedAt" IS NULL
        ORDER BY EXISTS (
              SELECT 1 FROM "CompetitionSeason" cs WHERE cs."competitionId" = c.id
            ) DESC, c.name ASC
        LIMIT ${Math.max(1, LIMIT)}`,
    )) as unknown as CompetitionRow[];
  }
  console.log(`  fila (competições): ${competitions.length}`);

  const entities = await fetchEntitiesChunked(
    competitions.map((c) => c.qid),
    'claims|descriptions',
  );

  const totals = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  for (const comp of competitions) {
    totals.processed++;
    const ent = entities.get(comp.qid);
    if (!ent?.claims && !ent?.descriptions) {
      totals.errors++;
      console.log(`  [${comp.qid}] ${comp.name}: entidade não obtida do Wikidata`);
      if (APPLY) {
        await prisma.competition.update({
          where: { id: comp.id },
          data: {
            competitionEnrichment: {
              at: new Date().toISOString(),
              status: 'error',
              processed: 0,
              updated: 0,
              skipped: 0,
              errors: 1,
            },
          },
        });
      }
      continue;
    }

    const data: Prisma.CompetitionUpdateInput = {};
    const log: string[] = [];
    let skipped = 0;

    // descriptions pt/en/es — só se NULL (o Json inteiro é daqui; zero overwrite).
    if (comp.description == null) {
      const desc = extractDescriptions(ent);
      const langs = Object.keys(desc) as CompetitionDescriptionLang[];
      if (langs.length > 0) {
        data.description = {
          ...desc,
          sourceUrl: `${WIKIDATA_ENTITY_URL_BASE}${comp.qid}`,
          at: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue;
        log.push(`description(${langs.join(',')})`);
      } else skipped++;
    }

    // P571 — ano de criação; só se NULL, precisão ≥ ano, faixa 1850..atual+1.
    if (comp.inceptionYear == null) {
      const year = extractInceptionYear(ent);
      if (year != null) {
        data.inceptionYear = year;
        log.push(`inceptionYear=${year}`);
      } else skipped++;
    }

    // P576 — extinção; só se NULL, precisão dia/ano, ≥ 1850.
    if (comp.dissolvedAt == null) {
      const dissolved = extractDissolvedAt(ent);
      if (dissolved) {
        data.dissolvedAt = dissolved;
        log.push(`dissolvedAt=${dissolved.toISOString().slice(0, 10)}`);
      } else skipped++;
    }

    const fieldsWritten = Object.keys(data).length;
    const status = fieldsWritten > 0 ? 'ok' : 'skipped';
    if (fieldsWritten > 0) totals.updated++;
    else totals.skipped++;
    console.log(
      `  [${comp.qid}] ${comp.name}: ${status}${log.length ? ` — ${log.join(' · ')}` : ''}`,
    );

    if (APPLY) {
      // Cursor por competição (padrão profileEnrichment T-22.3): a tentativa fica
      // registrada mesmo quando nada pôde ser preenchido — é o que faz a fila
      // avançar e o re-run ser noop.
      await prisma.competition.update({
        where: { id: comp.id },
        data: {
          ...data,
          competitionEnrichment: {
            at: new Date().toISOString(),
            status,
            processed: log.length,
            updated: fieldsWritten,
            skipped,
            errors: 0,
          },
        },
      });
    }
  }

  console.log(
    `\nResumo competições (${APPLY ? 'APPLY' : 'DRY-RUN'}): processado=${totals.processed} ` +
      `atualizado=${totals.updated} skipped=${totals.skipped} erros=${totals.errors}`,
  );
}

async function enrichStates(prisma: PrismaClient): Promise<void> {
  // Fila: qid != null E flagUrl NULL (State não tem cursor de tentativa — limitação
  // declarada no header; "sem bandeira" volta na próxima passada, como os troféus).
  const states = (await prisma.$queryRawUnsafe(
    `SELECT s.id, s.qid, s.name, s."flagUrl"
       FROM states s
      WHERE s.qid IS NOT NULL AND s."flagUrl" IS NULL
      ORDER BY s.name ASC
      LIMIT ${Math.max(1, LIMIT)}`,
  )) as unknown as StateRow[];
  console.log(`\nPassada 2 (estados) — fila: ${states.length}`);

  const entities = await fetchEntitiesChunked(
    states.map((s) => s.qid),
    'claims',
  );

  // 2º salto: P163 aponta para o ITEM da bandeira — o arquivo vem do P18 dele.
  const flagItemQids = new Set<string>();
  const flagItemByState = new Map<string, string>();
  for (const st of states) {
    const itemQid = extractFlagItemQid(entities.get(st.qid));
    if (itemQid) {
      flagItemByState.set(st.id, itemQid);
      flagItemQids.add(itemQid);
    }
  }
  const itemEntities = await fetchEntitiesChunked([...flagItemQids], 'claims');

  const totals = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  for (const st of states) {
    totals.processed++;
    const ent = entities.get(st.qid);
    if (!ent?.claims) {
      totals.errors++;
      console.log(`  [${st.qid}] ${st.name}: entidade não obtida do Wikidata`);
      continue; // falha de LEITURA nunca carimba "sem fonte" — volta na próxima passada
    }
    const itemQid = flagItemByState.get(st.id);
    const file = itemQid ? extractFlagFileFromItem(itemEntities.get(itemQid)) : null;
    if (itemQid && file) {
      const url = flagUrlFromFile(file);
      if (APPLY) {
        // Guarda de não-sobrescrita: só grava se AINDA estiver NULL.
        await prisma.state.updateMany({
          where: { id: st.id, flagUrl: null },
          data: { flagUrl: url },
        });
      }
      totals.updated++;
      console.log(`  [${st.qid}] ${st.name}: flagUrl → ${file}`);
    } else {
      totals.skipped++;
      const motivo = itemQid
        ? `item ${itemQid} sem P18`
        : extractFlagItemQid(ent) === null
          ? 'sem P163'
          : 'P163 inválida';
      console.log(`  [${st.qid}] ${st.name}: sem bandeira — ${motivo} (gap declarado)`);
    }
  }

  console.log(
    `\nResumo estados (${APPLY ? 'APPLY' : 'DRY-RUN'}): processado=${totals.processed} ` +
      `atualizado=${totals.updated} skipped=${totals.skipped} erros=${totals.errors}`,
  );
}

async function main(): Promise<void> {
  console.log(
    `T-24/25 enrich-competitions (${APPLY ? 'APPLY' : 'DRY-RUN'}) · limit=${LIMIT}` +
      `${IDS.length ? ` · ids=${IDS.length}` : ''}${STATES ? ' · --states' : ''}`,
  );
  const prisma = new PrismaClient();

  if (!STATES) await enrichCompetitions(prisma);
  if (STATES) await enrichStates(prisma);

  if (!APPLY) console.log('\nDRY-RUN: nenhuma escrita foi feita. Use --apply para gravar.');
  await prisma.$disconnect();
}

// Guarda de invocação direta: o módulo exporta extratores puros (testados no
// vitest) — importá-lo NÃO deve conectar no banco nem disparar o bot.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('enrich-competitions falhou:', err);
    process.exit(1);
  });
}
