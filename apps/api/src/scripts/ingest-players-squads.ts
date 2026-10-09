/**
 * T034 (mapeamento do portal, Operador 09/10) — ingESTA de JOGADORES em escala
 * via Wikidata P54, criando vínculos PLAYED_FOR que alimentam os perfis.
 *
 * ARQUITETURA em 2 fases baratas (connector wikidata-players-squads):
 *  1. SPARQL minimalista de vínculos por chunks de 50 clubes (padrão T421);
 *  2. enriquecimento via Special:EntityData em lotes de 50 (rótulo, P569,
 *     P27→ISO, P21, P413, P106 futebolista/treinador).
 *
 * REGRAS: dedup por QID; zero overwrite; proveniência obrigatória;
 * clube fora do acervo = recusa honesta; sem P54 = não entra; 1 req/s.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchEntityDataBatch,
  enrichPlayer,
  buildCountryIsoQuery,
  buildPositionLabelsQuery,
  parsePairsResponse,
  PLAYERS_SQUADS_USER_AGENT,
  WIKIDATA_SPARQL_ENDPOINT,
} from '../modules/etl/connectors/wikidata-players-squads.connector.js';
import {
  syncSquads,
  type SquadsEntry,
  type SquadsRepository,
} from '../modules/etl/connectors/wikidata-squads.connector.js';
import { logger } from '../config/logger.js';

const APPLY = process.argv.includes('--apply');
const BATCH = 100; // regra do Operador: apply em lotes de 100
const CLUB_CHUNK = 50; // VALUES grandes → 503 no Query Service
const COUNTRIES = (process.env.T034_COUNTRIES ?? 'BR')
  .split(',')
  .map((c) => c.trim().toUpperCase());
const LIMIT = Number(process.env.T034_LIMIT ?? '') || Infinity; // teto opcional de jogadores
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function sparqlQuery(query: string): Promise<unknown> {
  const url = `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': PLAYERS_SQUADS_USER_AGENT,
          Accept: 'application/sparql-results+json',
        },
      });
      if (res.ok) return await res.json();
      logger.warn({ status: res.status, attempt }, '[t034] SPARQL HTTP — retry');
    } catch (err) {
      logger.warn({ err: String(err).slice(0, 80), attempt }, '[t034] SPARQL fetch — retry');
    }
    if (attempt < 2) await sleep(2000 * 2 ** attempt);
  }
  throw new Error('SPARQL falhou após 3 tentativas');
}

interface Link {
  playerQid: string;
  clubQid: string;
  startYear: number | null;
  endYear: number | null;
}

interface EnrichedPlayer {
  qid: string;
  name: string;
  birthDate: string | null;
  countryCode: string | null;
  gender: 'men' | 'women' | null;
  position: string | null;
  links: Link[];
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    // 1. Clubes do escopo — T500: T034_GENDER=women filtra clubes femininos
    // (ignora países); default: país + QID. Fora do acervo = recusa honesta.
    const genderFilter = process.env.T034_GENDER ?? '';
    const clubWhere = genderFilter
      ? { gender: genderFilter, qid: { not: null }, deletedAt: null }
      : { country: { in: COUNTRIES }, qid: { not: null }, deletedAt: null };
    const clubs = await prisma.club.findMany({
      where: clubWhere,
      select: { id: true, qid: true, name: true },
    });
    const clubQids = clubs.map((c) => c.qid!).filter(Boolean);
    const clubIdByQid = new Map(clubs.map((c) => [c.qid!, c.id]));
    console.log(
      `[t034] escopo: países=${COUNTRIES.join(',')} · gênero-clubes=${genderFilter || 'todos'} · clubes com QID=${clubQids.length} · modo=${APPLY ? 'APPLY' : 'DRY-RUN'}`,
    );
    if (clubQids.length === 0) {
      console.log('[t034] nenhum clube no escopo — nada a fazer.');
      return 0;
    }

    // Fase 1 — SPARQL minimalista de vínculos (chunks de 50 clubes; dedup por
    // jogador|clube entre chunks e páginas).
    const links: Link[] = [];
    const seenLink = new Set<string>();
    const PAGE = 5000;
    for (let i = 0; i < clubQids.length; i += CLUB_CHUNK) {
      const chunk = clubQids.slice(i, i + CLUB_CHUNK);
      console.log(
        `[t034] fase 1 chunk ${Math.floor(i / CLUB_CHUNK) + 1}/${Math.ceil(clubQids.length / CLUB_CHUNK)} (${chunk.length} clubes)…`,
      );
      // ORDER BY estável + paginação até esgotar: sem isso a Wikidata retorna
      // conjuntos não-determinísticos entre execuções (o re-run não era noop).
      for (let offset = 0; ; offset += PAGE) {
        const query = `SELECT ?player ?club ?start ?end WHERE {
  VALUES ?club { ${chunk.map((q) => 'wd:' + q).join(' ')} }
  ?player p:P54 ?stmt .
  ?stmt ps:P54 ?club .
  OPTIONAL { ?stmt pq:P580 ?start . }
  OPTIONAL { ?stmt pq:P582 ?end . }
}
ORDER BY ?player ?club ?start
LIMIT ${PAGE} OFFSET ${offset}`;
        const json = (await sparqlQuery(query)) as {
          results?: { bindings?: Array<Record<string, { value?: string }>> };
        };
        const bindings = json.results?.bindings ?? [];
        let novos = 0;
        for (const b of bindings) {
          const pq = b.player?.value?.split('/').pop();
          const cq = b.club?.value?.split('/').pop();
          if (!pq || !cq) continue;
          const key = `${pq}|${cq}`;
          if (seenLink.has(key)) continue;
          seenLink.add(key);
          const yr = (v?: string) => (v ? Number.parseInt(v.slice(0, 4), 10) || null : null);
          links.push({
            playerQid: pq,
            clubQid: cq,
            startYear: yr(b.start?.value),
            endYear: yr(b.end?.value),
          });
          novos += 1;
        }
        console.log(`  offset ${offset}: +${novos} novos`);
        if (bindings.length < PAGE) break; // chunk esgotado
        await sleep(1000);
      }
    }
    console.log(`[t034] fase 1: ${links.length} vínculos P54 destilados`);
    const playerQids = [...new Set(links.map((l) => l.playerQid))].sort().slice(0, LIMIT);
    console.log(
      `[t034] jogadores distintos: ${playerQids.length}${Number.isFinite(LIMIT) && playerQids.length === LIMIT ? ' (limitado)' : ''}`,
    );

    // Fase 2 — enriquecimento via Special:EntityData (lotes de 50, 1 req/s).
    const isoJson = await sparqlQuery(buildCountryIsoQuery());
    const countryIsoByQid = new Map(parsePairsResponse(isoJson).map((p) => [p.qid, p.value]));
    const entities = await fetchEntityDataBatch(playerQids, {
      userAgent: PLAYERS_SQUADS_USER_AGENT,
      sleep,
    });
    const posQids = new Set<string>();
    for (const e of entities.values()) for (const q of e.positionQids) posQids.add(q);
    let positionLabelByQid = new Map<string, string>();
    if (posQids.size > 0) {
      const posJson = await sparqlQuery(buildPositionLabelsQuery([...posQids]));
      positionLabelByQid = new Map(parsePairsResponse(posJson).map((p) => [p.qid, p.value]));
    }

    // Índice O(1): com 94k jogadores × 238k links, o filter por jogador é O(n×m) = OOM.
    const linksByPlayer = new Map<string, Link[]>();
    for (const l of links) {
      const arr = linksByPlayer.get(l.playerQid);
      if (arr) arr.push(l);
      else linksByPlayer.set(l.playerQid, [l]);
    }

    const enriched: EnrichedPlayer[] = [];
    let rejectedOccupation = 0;
    let rejectedNoLabel = 0;
    for (const qid of playerQids) {
      const d = entities.get(qid);
      if (!d) {
        rejectedNoLabel += 1;
        continue;
      }
      const r = enrichPlayer(d, countryIsoByQid, positionLabelByQid);
      if (!r.ok) {
        if (r.reason === 'no_label') rejectedNoLabel += 1;
        else rejectedOccupation += 1;
        continue;
      }
      enriched.push({
        qid: r.player.qid,
        name: r.player.name,
        birthDate: r.player.birthDate,
        countryCode: r.player.countryCode,
        gender: r.player.gender,
        position: r.player.position,
        links: linksByPlayer.get(qid) ?? [],
      });
    }
    console.log(
      `[t034] fase 2: aceitos=${enriched.length} · sem-rótulo=${rejectedNoLabel} · ocupação-fora-do-escopo=${rejectedOccupation}`,
    );
    for (const s of enriched.slice(0, 5)) {
      console.log(
        `  amostra: ${s.qid} ${s.name} (${s.position ?? 's/posição'}, ${s.countryCode ?? 's/país'}) · ${s.links.length} vínculo(s)`,
      );
    }

    // Dedup por QID contra o acervo (zero overwrite).
    const eqids = enriched.map((e) => e.qid);
    const existing = await prisma.player.findMany({
      where: { qid: { in: eqids } },
      select: { qid: true },
    });
    const existingQids = new Set(existing.map((e) => e.qid));
    const missing = enriched.filter((e) => !existingQids.has(e.qid));
    console.log(
      `[t034] dedup: existentes=${existing.length} · wouldCreate=${missing.length} · jogadores já no acervo=${existing.length}`,
    );
    if (!APPLY) {
      console.log('[t034] DRY-RUN — nada gravado. Rode com --apply.');
      return 0;
    }

    // APPLY — lotes de 100: cria ausentes (insert-only, zero overwrite).
    let created = 0;
    for (let i = 0; i < missing.length; i += BATCH) {
      const chunk = missing.slice(i, i + BATCH);
      for (const p of chunk) {
        try {
          await prisma.player.create({
            data: {
              fullName: p.name.slice(0, 300),
              // P569 com precision < 11 pode vir malformado — nunca gravar Invalid Date.
              birthDate:
                p.birthDate && !Number.isNaN(new Date(p.birthDate).getTime())
                  ? new Date(p.birthDate)
                  : null,
              country: p.countryCode,
              gender: p.gender,
              position: p.position,
              qid: p.qid,
              importedFrom: 'wikidata-players',
              importedAt: new Date(),
              sourceUrl: 'https://www.wikidata.org/wiki/' + p.qid,
            },
          });
          created += 1;
        } catch (err) {
          if ((err as { code?: string }).code !== 'P2002') throw err; // corrida de unique ⇒ mantém
        }
      }
      console.log(
        `[t034] lote ${Math.floor(i / BATCH) + 1}/${Math.ceil(missing.length / BATCH)} — criados até agora: ${created}`,
      );
    }
    console.log(`[t034] jogadores criados=${created}`);

    // Vínculos PLAYED_FOR (anti-órfão; clube fora do acervo = recusa).
    const now = await prisma.player.findMany({
      where: { qid: { in: eqids } },
      select: { id: true, qid: true },
    });
    const playerIdByQid = new Map(now.map((e) => [e.qid!, e.id]));
    const repo: SquadsRepository = {
      async findPlayerByQid(qid) {
        const cached = playerIdByQid.get(qid);
        if (cached) return { id: cached };
        return prisma.player.findFirst({ where: { qid }, select: { id: true } });
      },
      async findClubByQid(qid) {
        const cached = clubIdByQid.get(qid);
        if (cached) return { id: cached };
        return prisma.club.findFirst({ where: { qid }, select: { id: true } });
      },
      async findEdgeByKey({ sourceId, targetId, relation, year }) {
        return prisma.knowledgeGraph.findFirst({
          where: { sourceId, targetId, relation, metadata: { path: ['year'], equals: year } },
          select: { id: true },
        });
      },
      async createEdge(args) {
        return prisma.knowledgeGraph.create({
          data: { ...args, metadata: args.metadata as Prisma.InputJsonValue },
          select: { id: true },
        });
      },
    };
    let edgesCreated = 0;
    let edgesSkipped = 0;
    let clubMissing = 0;
    for (const p of enriched) {
      for (const link of p.links) {
        const year = link.startYear ?? link.endYear ?? 0; // 0 = vínculo sem ano (honesto)
        const entry: SquadsEntry = {
          playerQid: p.qid,
          clubQid: link.clubQid,
          year: year >= 1900 ? year : 0,
        };
        const result = await syncSquads([entry], repo, {
          sourceUrlBase: 'https://www.wikidata.org/wiki/',
        });
        if (result.orphans.length > 0) {
          clubMissing += 1;
          continue;
        }
        if (result.persisted.length > 0) {
          const meta: Record<string, unknown> = {
            P54: true,
            dataSource: 'wikidata',
            license: 'CC0',
            sourceUrl: 'https://www.wikidata.org/wiki/' + p.qid,
          };
          if (link.startYear != null) meta.startYear = link.startYear;
          if (link.endYear != null) meta.endYear = link.endYear;
          if (year >= 1900) {
            meta.year = year;
            meta.season = String(year);
          }
          await prisma.knowledgeGraph.update({
            where: { id: result.persisted[0].edgeId! },
            data: { metadata: meta as Prisma.InputJsonValue },
          });
          edgesCreated += 1;
        } else {
          edgesSkipped += result.skipped.length;
        }
      }
    }
    console.log(
      `[t034] vínculos PLAYED_FOR: criados=${edgesCreated} · já-existiam=${edgesSkipped} · clube-fora-do-acervo(recusados)=${clubMissing}`,
    );

    const edgesTotal = await prisma.knowledgeGraph.count({
      where: { relation: 'PLAYED_FOR', metadata: { path: ['P54'], equals: true } },
    });
    console.log(`[t034] knowledge_graph PLAYED_FOR com P54:true = ${edgesTotal}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('ingest-players-squads')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 200) }, '[t034] falha na ingestão de jogadores');
      process.exit(1);
    });
}
