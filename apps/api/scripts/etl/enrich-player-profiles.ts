/**
 * T-22.3 (tarefa 23) — enriquecimento do PERFIL do jogador via Wikidata (CC0).
 *
 * Fonte: Wikidata `action=wbgetentities` (dados CC0) —
 *   P1449 apelido · P569 nascimento (só precisão de DIA) · P2048 altura (unit Q1747289 = cm)
 *   P413 posição (item → label → PlayerPosition de packages/domain) · P423 pé preferido
 *   P54 member of sports team (qualifiers P580 ano, P582 endYear, P1350 jogos, P1351 gols)
 *   P166 award received (qualifier P585 ano) → `players.individualAwards`.
 * Licença CC0 — como reverter (reversível por proveniência):
 *   UPDATE players SET nickname=NULL, "heightCm"=NULL, "preferredFoot"=NULL,
 *     "individualAwards"=NULL, "profileEnrichment"=NULL WHERE "profileEnrichment" IS NOT NULL;
 *   DELETE FROM knowledge_graph WHERE "sourceType"='Player' AND relation='PLAYED_FOR'
 *     AND metadata->>'profileSource'='wikidata:P54';
 *
 * Regras (idempotent-seed, à risca):
 *   - ZERO OVERWRITE: colunas só preenchem quando NULL; metadata de aresta existente
 *     recebe apenas chaves AUSENTES (apps/goals de outra fonte = mantém + loga);
 *   - fila por cursor: só entram jogadores com `profileEnrichment IS NULL` (registro
 *     ausente = nunca tentado — padrão mediaEnrichment T550) → re-run = noop;
 *   - NUNCA cria clube: stint cujo QID de clube não está no acervo = skip + `missingClub`;
 *   - guards de plausibilidade: altura 130–250 cm, jogos ≤2000, gols ≤1000, ano
 *     1850..atual+1; fora de faixa = descarta o qualificador e declara o gap.
 *
 * Uso (local, Postgres de dev em infra/):
 *   npx tsx scripts/etl/enrich-player-profiles.ts                              # DRY-RUN verboso
 *   npx tsx scripts/etl/enrich-player-profiles.ts --apply --limit=200
 *   npx tsx scripts/etl/enrich-player-profiles.ts --apply --player-ids=<uuid1,uuid2>
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { fetchWithRetry } from '../lib/http-resilience.js';

const UA = 'AlmanaqueDosClubes-EnrichPlayerProfiles/1.0 (+https://almanaquedosclubes.com)';
const ENTITY_URL = (qids: string[], props: string) =>
  `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}` +
  `&props=${props}&format=json`;
const CHUNK_SIZE = 50;
const PAUSE_MS = 500;
const WIKIDATA_ENTITY_URL_BASE = 'https://www.wikidata.org/wiki/';
const FOOT_UNIT_QID = 'Q1747289'; // centímetro

const APPLY = process.argv.includes('--apply');
const LIMIT = Number(
  (process.argv.find((a) => a.startsWith('--limit=')) ?? '--limit=200').split('=')[1],
);
const PLAYER_IDS = (process.argv.find((a) => a.startsWith('--player-ids=')) ?? '--player-ids=')
  .split('=')[1]
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Guards de plausibilidade do DADO (não do parse)
// ---------------------------------------------------------------------------
const HEIGHT_MIN = 130;
const HEIGHT_MAX = 250;
const APPS_MAX = 2000;
const GOALS_MAX = 1000;
const YEAR_MIN = 1850;

// ---------------------------------------------------------------------------
// Mapeamentos por label (en/pt/es) — não-mapeável = ignora + loga
// ---------------------------------------------------------------------------
const POSITION_KEYWORDS: Array<[position: string, keywords: string[]]> = [
  ['GOALKEEPER', ['goalkeeper', 'goleiro', 'guardian', 'guardián', 'portero', 'arquero']],
  [
    'DEFENDER',
    [
      'centre-back',
      'center-back',
      'centre back',
      'center back',
      'full-back',
      'fullback',
      'wing-back',
      'defender',
      'zagueiro',
      'lateral',
      'defensa',
      'libero',
      'líbero',
      'sweeper',
    ],
  ],
  [
    'MIDFIELDER',
    [
      'midfielder',
      'meio-campista',
      'meio campista',
      'meia',
      'volante',
      'centrocampista',
      'mediocampista',
      'mediocentro',
    ],
  ],
  [
    'FORWARD',
    [
      'centre forward',
      'center forward',
      'centre-forward',
      'center-forward',
      'striker',
      'forward',
      'winger',
      'atacante',
      'avançado',
      'avancado',
      'ponta',
      'delantero',
      'extremo',
    ],
  ],
];

/** label → PlayerPosition (packages/domain). Não-mapeável = null (ignora + loga). */
export function positionFromLabel(label: string): string | null {
  const l = label.toLowerCase();
  for (const [position, keywords] of POSITION_KEYWORDS) {
    if (keywords.some((k) => l.includes(k))) return position;
  }
  return null;
}

/** label do P423 → 'left' | 'right' | 'both'. Senão null (o chamador declara o gap). */
export function footFromLabel(label: string): 'left' | 'right' | 'both' | null {
  const l = label.toLowerCase();
  // 'ambidestro' contém 'destro' — o teste de ambos os pés vem PRIMEIRO.
  if (/both|ambid|ambas/.test(l)) return 'both';
  if (/left|esquerd|izquierd|canhoto/.test(l)) return 'left';
  if (/right|direita|direito|derecha|derecho|destro/.test(l)) return 'right';
  return null;
}

/** time Wikidata `+1956-09-01T00:00:00Z` → 1956; null se fora do padrão/faixa. */
export function yearFromWikidataTime(time: unknown): number | null {
  if (typeof time !== 'string' || !/^[+-]\d{4}-\d{2}-\d{2}T/.test(time)) return null;
  const year = Number(time.slice(1, 5));
  const max = new Date().getUTCFullYear() + 1;
  if (!Number.isInteger(year) || year < YEAR_MIN || year > max) return null;
  return year;
}

// ---------------------------------------------------------------------------
// Fetch chunkado de entidades (50 QIDs por chamada, backoff T448)
// ---------------------------------------------------------------------------
interface SnakLike {
  mainsnak?: { datavalue?: { value?: unknown }; snaktype?: string };
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
}
interface EntityLike {
  claims?: Record<string, SnakLike[]>;
  labels?: Record<string, { language: string; value: string }>;
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchEntitiesChunked(
  qids: string[],
  props: 'claims|labels' | 'labels',
): Promise<Map<string, EntityLike>> {
  const out = new Map<string, EntityLike>();
  for (const part of chunked([...new Set(qids)], CHUNK_SIZE)) {
    try {
      const res = await fetchWithRetry(
        ENTITY_URL(part, props),
        { headers: { 'user-agent': UA, Accept: 'application/json' } },
        { label: 'enrich-player-profiles' },
      );
      const json = (await res.json()) as { entities?: Record<string, EntityLike> };
      for (const [qid, ent] of Object.entries(json.entities ?? {})) out.set(qid, ent);
    } catch (err) {
      // Falha ruidosa do CHUNK: os QIDs dele ficam sem dado (contam como erro no
      // resumo), o lote continua — a próxima rodada os re-tenta (cursor não avança
      // para jogador cujo fetch falhou? avança: status='error' grava a tentativa).
      console.error(`  chunk (${part.length} QIDs) falhou: ${(err as Error).message.slice(0, 90)}`);
    }
    await sleep(PAUSE_MS);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Extração pura (exportada para teste)
// ---------------------------------------------------------------------------
export interface Stint {
  clubQid: string;
  year: number | null;
  endYear: number | null;
  apps: number | null;
  goals: number | null;
}

const firstQualifierAmount = (st: SnakLike, prop: string): number | null => {
  const v = st.qualifiers?.[prop]?.[0]?.datavalue?.value as { amount?: unknown } | undefined;
  const n = Number(v?.amount);
  return Number.isFinite(n) ? n : null;
};

const qualifierTime = (st: SnakLike, prop: string): unknown =>
  (st.qualifiers?.[prop]?.[0]?.datavalue?.value as { time?: unknown } | undefined)?.time;

/** P2048 → altura em cm (unit Q1747289, com folga para statement sem unit). */
export function extractHeightCm(entity: EntityLike): number | null {
  const st = entity.claims?.P2048?.[0];
  const value = st?.mainsnak?.datavalue?.value as { amount?: unknown; unit?: unknown } | undefined;
  if (!value) return null;
  const unit = typeof value.unit === 'string' ? value.unit.split('/').pop() : undefined;
  if (unit && unit !== FOOT_UNIT_QID) return null; // só cm; polegadas/metros = gap declarado
  const cm = Math.round(Number(value.amount));
  if (!Number.isFinite(cm) || cm < HEIGHT_MIN || cm > HEIGHT_MAX) return null;
  return cm;
}

/** P569 → Date, APENAS com precisão de dia (precisão menor fabricaria dia/mês). */
export function extractBirthDate(entity: EntityLike): Date | null {
  const st = entity.claims?.P569?.[0];
  const value = st?.mainsnak?.datavalue?.value as
    { time?: unknown; precision?: unknown } | undefined;
  if (typeof value?.time !== 'string' || value.precision !== 11) return null;
  const m = /^\+(\d{4}-\d{2}-\d{2})T/.exec(value.time);
  if (!m) return null;
  const d = new Date(`${m[1]}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** P54 → stints (guardas: QID de clube, faixa de ano, apps/goals plausíveis). */
export function extractStints(entity: EntityLike): Stint[] {
  const out: Stint[] = [];
  for (const st of entity.claims?.P54 ?? []) {
    const value = st.mainsnak?.datavalue?.value as { id?: unknown } | undefined;
    const clubQid = typeof value?.id === 'string' ? value.id : '';
    if (!/^Q\d+$/.test(clubQid)) continue;
    const year = yearFromWikidataTime(qualifierTime(st, 'P580'));
    const endYear = yearFromWikidataTime(qualifierTime(st, 'P582'));
    const appsRaw = firstQualifierAmount(st, 'P1350');
    const goalsRaw = firstQualifierAmount(st, 'P1351');
    const apps =
      appsRaw != null && Number.isInteger(appsRaw) && appsRaw >= 0 && appsRaw <= APPS_MAX
        ? appsRaw
        : null;
    const goals =
      goalsRaw != null && Number.isInteger(goalsRaw) && goalsRaw >= 0 && goalsRaw <= GOALS_MAX
        ? goalsRaw
        : null;
    out.push({ clubQid, year, endYear, apps, goals });
  }
  return out;
}

export interface Award {
  qid: string;
  label: string;
  year: number | null;
  sourceUrl: string;
}

/** P166 → prêmios (label resolvido na 2ª rodada; ano do qualifier P585). */
export function extractAwards(entity: EntityLike, labelByQid: Map<string, string>): Award[] {
  const out: Award[] = [];
  for (const st of entity.claims?.P166 ?? []) {
    const value = st.mainsnak?.datavalue?.value as { id?: unknown } | undefined;
    const qid = typeof value?.id === 'string' && /^Q\d+$/.test(value.id) ? value.id : null;
    if (!qid) continue;
    const label = labelByQid.get(qid) ?? qid;
    const year = yearFromWikidataTime(qualifierTime(st, 'P585'));
    out.push({ qid, label, year, sourceUrl: `${WIKIDATA_ENTITY_URL_BASE}${qid}` });
  }
  return out;
}

/** Merge zero-overwrite de prêmios: dedup por (qid, year), ordenado por year desc. */
export function mergeAwards(
  current: unknown,
  incoming: Award[],
): { merged: Award[]; added: number } {
  const prev = Array.isArray(current) ? (current as Award[]) : [];
  const seen = new Set(prev.map((a) => `${a.qid}|${a.year ?? ''}`));
  const additions = incoming.filter((a) => !seen.has(`${a.qid}|${a.year ?? ''}`));
  if (additions.length === 0) return { merged: prev, added: 0 };
  const merged = [...prev, ...additions].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return { merged, added: additions.length };
}

/** metadata existente recebe APENAS chaves ausentes (zero overwrite). */
export function mergeStintMetadata(
  current: unknown,
  stint: Stint,
): { metadata: Record<string, unknown>; added: string[] } {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  const candidate: Record<string, unknown> = {
    year: stint.year,
    endYear: stint.endYear,
    apps: stint.apps,
    goals: stint.goals,
    profileSource: 'wikidata:P54',
  };
  const metadata = { ...base };
  const added: string[] = [];
  for (const [k, v] of Object.entries(candidate)) {
    if (v == null) continue; // null não sobrescreve nem ocupa chave
    if (base[k] != null) continue; // já tem (outra fonte) = mantém + loga
    metadata[k] = v;
    added.push(k);
  }
  return { metadata, added };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
interface PlayerRow {
  id: string;
  qid: string;
  fullName: string;
  clubId: string | null;
  birthDate: Date | null;
  position: string | null;
  nickname: string | null;
  heightCm: number | null;
  preferredFoot: string | null;
  individualAwards: unknown;
}

async function main(): Promise<void> {
  console.log(
    `T-22.3 enrich-player-profiles (${APPLY ? 'APPLY' : 'DRY-RUN'}) · limit=${LIMIT}` +
      `${PLAYER_IDS.length ? ` · player-ids=${PLAYER_IDS.length}` : ''}`,
  );
  const prisma = new PrismaClient();
  const nowIso = () => new Date().toISOString();

  // Fila: qid != null e NUNCA tentado (`profileEnrichment` ausente) — com clube primeiro,
  // depois createdAt. Sem ORDER BY não há fila determinística (lição T448/#448).
  let players: PlayerRow[];
  if (PLAYER_IDS.length > 0) {
    // Modo explícito (--player-ids): re-tenta os pedidos, ignorando o cursor.
    players = (await prisma.player.findMany({
      where: { id: { in: PLAYER_IDS }, qid: { not: null } },
      select: {
        id: true,
        qid: true,
        fullName: true,
        clubId: true,
        birthDate: true,
        position: true,
        nickname: true,
        heightCm: true,
        preferredFoot: true,
        individualAwards: true,
      },
      orderBy: { createdAt: 'asc' },
    })) as PlayerRow[];
    const semQid = PLAYER_IDS.length - players.length;
    if (semQid > 0) console.log(`  ${semQid} id(s) sem qid no acervo — ignorados`);
  } else {
    players = (await prisma.$queryRawUnsafe(
      // `(clubId IS NULL)` false→true coloca com-clube primeiro; `profileEnrichment
      // IS NULL` é o cursor de tentativa (registro ausente = nunca tentado, T550).
      `SELECT id, qid, "fullName", "clubId", "birthDate", position, nickname, "heightCm",
              "preferredFoot", "individualAwards"
         FROM players
        WHERE qid IS NOT NULL AND "profileEnrichment" IS NULL
        ORDER BY ("clubId" IS NULL) ASC, "createdAt" ASC
        LIMIT ${Math.max(1, LIMIT)}`,
    )) as unknown as PlayerRow[];
  }
  console.log(`  fila: ${players.length} jogador(es)`);

  const entities = await fetchEntitiesChunked(
    players.map((p) => p.qid),
    'claims|labels',
  );

  // 2ª rodada: labels dos QIDs referenciados (P413/P423/P166) para mapear posição/pé/prêmio.
  const refQids: string[] = [];
  for (const p of players) {
    const ent = entities.get(p.qid);
    if (!ent?.claims) continue;
    for (const prop of ['P413', 'P423', 'P166']) {
      for (const st of ent.claims[prop] ?? []) {
        const v = st.mainsnak?.datavalue?.value as { id?: unknown } | undefined;
        if (typeof v?.id === 'string' && /^Q\d+$/.test(v.id)) refQids.push(v.id);
      }
    }
  }
  const labelEntities = await fetchEntitiesChunked(refQids, 'labels');
  const labelByQid = new Map<string, string>();
  for (const [qid, ent] of labelEntities) {
    const label = ent.labels?.en?.value ?? ent.labels?.['pt-br']?.value ?? ent.labels?.pt?.value;
    if (label) labelByQid.set(qid, label);
  }

  // Cache de clube por QID (o mesmo clube repete entre jogadores).
  const clubIdByQid = new Map<string, string | null>();

  const totals = {
    processed: 0,
    updated: 0,
    skipped: 0,
    missingClub: 0,
    kgWritten: 0,
    errors: 0,
  };

  for (const p of players) {
    totals.processed++;
    const ent = entities.get(p.qid);
    if (!ent?.claims) {
      totals.errors++;
      console.log(`  [${p.qid}] ${p.fullName}: entidade não obtida do Wikidata`);
      if (APPLY) {
        await prisma.player.update({
          where: { id: p.id },
          data: {
            profileEnrichment: {
              at: nowIso(),
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

    const data: Prisma.PlayerUpdateInput = {};
    const log: string[] = [];
    let skipped = 0;

    // P1449 — apelido (string); só quando NULL.
    if (p.nickname == null) {
      const nick = ent.claims.P1449?.[0]?.mainsnak?.datavalue?.value;
      if (typeof nick === 'string' && nick.trim()) {
        data.nickname = nick.trim();
        log.push(`nickname="${nick.trim()}"`);
      } else skipped++;
    }

    // P569 — nascimento; SÓ se NULL (nunca overwrite), só com precisão de dia.
    if (p.birthDate == null) {
      const birth = extractBirthDate(ent);
      if (birth) {
        data.birthDate = birth;
        log.push(`birthDate=${birth.toISOString().slice(0, 10)}`);
      } else skipped++;
    }

    // P2048 — altura em cm; só se NULL.
    if (p.heightCm == null) {
      const cm = extractHeightCm(ent);
      if (cm != null) {
        data.heightCm = cm;
        log.push(`heightCm=${cm}`);
      } else skipped++;
    }

    // P413 — posição via label; só se NULL; não-mapeável = ignora + loga.
    if (p.position == null) {
      const posQid = (ent.claims.P413?.[0]?.mainsnak?.datavalue?.value as { id?: unknown })?.id;
      const label = typeof posQid === 'string' ? labelByQid.get(posQid) : undefined;
      const position = label ? positionFromLabel(label) : null;
      if (position) {
        data.position = position;
        log.push(`position=${position} (${label})`);
      } else {
        if (label) console.log(`    P413 "${label}" não mapeável — ignorado (${p.qid})`);
        skipped++;
      }
    }

    // P423 — pé preferido via label; só se NULL.
    if (p.preferredFoot == null) {
      const footQid = (ent.claims.P423?.[0]?.mainsnak?.datavalue?.value as { id?: unknown })?.id;
      const label = typeof footQid === 'string' ? labelByQid.get(footQid) : undefined;
      const foot = label ? footFromLabel(label) : null;
      if (foot) {
        data.preferredFoot = foot;
        log.push(`preferredFoot=${foot}`);
      } else skipped++;
    }

    // P166 — prêmios individuais (merge dedup por qid+year, year desc).
    const awards = extractAwards(ent, labelByQid);
    let awardsAdded = 0;
    if (awards.length > 0) {
      const { merged, added } = mergeAwards(p.individualAwards, awards);
      if (added > 0) {
        data.individualAwards = merged as unknown as Prisma.InputJsonValue;
        awardsAdded = added;
        log.push(`individualAwards +${added} (${merged.length} total)`);
      }
    }

    // P54 — stints → KnowledgeGraph PLAYED_FOR (clube inexistente = skip + missingClub).
    let kgWritten = 0;
    let kgMissingClub = 0;
    let kgKeptForeign = 0;
    for (const stint of extractStints(ent)) {
      let clubId = clubIdByQid.get(stint.clubQid);
      if (clubId === undefined) {
        const club = await prisma.club.findFirst({
          where: { qid: stint.clubQid, deletedAt: null },
          select: { id: true },
        });
        clubId = club?.id ?? null;
        clubIdByQid.set(stint.clubQid, clubId);
      }
      if (!clubId) {
        kgMissingClub++;
        continue; // NUNCA criar clube
      }
      const existing = await prisma.knowledgeGraph.findFirst({
        where: {
          sourceId: p.id,
          sourceType: 'Player',
          relation: 'PLAYED_FOR',
          targetId: clubId,
        },
        select: { id: true, metadata: true },
      });
      const { metadata, added } = mergeStintMetadata(existing?.metadata, stint);
      const kept = ['apps', 'goals'].filter(
        (k) =>
          metadata[k] != null &&
          (stint as unknown as Record<string, unknown>)[k] != null &&
          (existing?.metadata as Record<string, unknown> | null)?.[k] != null,
      );
      if (kept.length > 0) kgKeptForeign += kept.length;
      if (!existing) {
        if (APPLY) {
          await prisma.knowledgeGraph.create({
            data: {
              sourceId: p.id,
              sourceType: 'Player',
              relation: 'PLAYED_FOR',
              targetId: clubId,
              targetType: 'Club',
              metadata: metadata as Prisma.InputJsonValue,
            },
          });
        }
        kgWritten++;
      } else if (added.length > 0) {
        if (APPLY) {
          await prisma.knowledgeGraph.update({
            where: { id: existing.id },
            data: { metadata: metadata as Prisma.InputJsonValue },
          });
        }
        kgWritten++;
      }
    }
    totals.kgWritten += kgWritten;
    totals.missingClub += kgMissingClub;
    if (kgMissingClub > 0) log.push(`missingClub=${kgMissingClub}`);
    if (kgKeptForeign > 0) log.push(`apps/goals já presentes mantidos=${kgKeptForeign}`);

    const fieldsWritten = Object.keys(data).length;
    const status = fieldsWritten + kgWritten > 0 ? 'ok' : 'skipped';
    if (fieldsWritten + kgWritten > 0) totals.updated++;
    else totals.skipped++;
    console.log(
      `  [${p.qid}] ${p.fullName}: ${status}${log.length ? ` — ${log.join(' · ')}` : ''}`,
    );

    if (APPLY) {
      // Cursor por jogador (padrão mediaEnrichment T550): a tentativa fica registrada
      // mesmo quando nada pôde ser preenchido — é o que faz a fila avançar e o
      // re-run ser noop.
      await prisma.player.update({
        where: { id: p.id },
        data: {
          ...data,
          profileEnrichment: {
            at: nowIso(),
            status,
            processed: log.length + awardsAdded,
            updated: fieldsWritten + kgWritten,
            skipped,
            errors: 0,
          },
        },
      });
    }
  }

  console.log(
    `\nResumo (${APPLY ? 'APPLY' : 'DRY-RUN'}): processado=${totals.processed} ` +
      `atualizado=${totals.updated} skipped=${totals.skipped} ` +
      `stintsKG=${totals.kgWritten} missingClub=${totals.missingClub} erros=${totals.errors}`,
  );
  if (!APPLY) console.log('DRY-RUN: nenhuma escrita foi feita. Use --apply para gravar.');
  await prisma.$disconnect();
}

// Guarda de invocação direta: o módulo exporta extratores puros (testados no
// vitest) — importá-lo NÃO deve conectar no banco nem disparar o bot.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('enrich-player-profiles falhou:', err);
    process.exit(1);
  });
}
