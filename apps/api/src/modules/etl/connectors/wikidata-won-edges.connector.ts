/**
 * T448 — Conector Wikidata (arestas WON: clube campeão de uma competição-mãe).
 *
 * Estratégia: ancorar em EDIÇÕES de competições de futebol (Q1478437) que têm
 * vencedor (P1346) e competição-mãe (P3450 "sports season of"), com ano vindo
 * de P585 (point in time) / P580 (start) / P582 (end). A query foi validada
 * contra o endpoint real nesta tarefa (forma union-first + filtro nativo de
 * dateTime — a forma com OPTIONAL+COALESCE dá 504 no endpoint).
 *
 * O vencedor é resolvido contra o acervo `clubs` por QID (a chave que o T429
 * importou) e a mãe contra `competitions` por QID. NADA de fuzzy-match de
 * nome: QID ausente = pulado e CONTADO (nunca fabricado — honestidade 1.3).
 *
 * Usa exclusivamente Wikidata (CC0), User-Agent identificado e é idempotente
 * (mesma entrada → mesma aresta). Fonte aberta; auditoria no DISPATCH T448
 * (FASE 0 provou: knowledge_graph nasce vazio por design; este conector é o
 * primeiro escritor de WON).
 */
import { z } from 'zod';
import {
  RANKING_HIERARCHIES,
  isWomensCompetition,
  resolveHierarchy,
  type RankHierarchy,
} from '../../rankings/ranking-algorithm.service.js';

export const WON_RELATION = 'WON' as const;
export const WON_DATASOURCE = 'wikidata' as const;
export const WON_LICENSE = 'CC0' as const;

/** Classe "association football competition" — verificada ao vivo no T448 (amostra: FA Cup). */
export const FOOTBALL_COMPETITION_CLASS_QID = 'Q1478437' as const;

export const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql' as const;
export const WIKIDATA_ENTITY_URL_BASE = 'https://www.wikidata.org/wiki/' as const;

export const WON_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata won-edges ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

export const WON_MIN_YEAR = 1870; // primeira FA Cup (1872) — folga
export const WON_WINDOW_YEARS = 5; // janelas curtas: o endpoint dá 504 acima de ~60s
export const WON_PAGE_LIMIT = 10_000; // guarda de segurança; janela real ≪ (máx ~2.2k)

/** Marcadores femininos além de `isWomensCompetition` (Fem./femenino/feminina...). */
const EXTRA_WOMEN_MARKERS = /\b(femenin[oa]s?|feminin[oa]s?|femenil|fem\.?)\b/i;

/**
 * Gênero derivado do nome da competição-mãe. Mesma fonte de verdade do ranking
 * (`isWomensCompetition`) + marcadores extras do dispatch T448. Default 'men'.
 * Vocabulário 'men'|'women' = o JÁ estabelecido em metadata.gender
 * (WOMENS_GENDER_VALUE='women') — não introduz terceiro vocabulário.
 */
export function resolveGender(name: string | null | undefined): 'men' | 'women' {
  if (!name) return 'men';
  if (isWomensCompetition({ name })) return 'women';
  if (EXTRA_WOMEN_MARKERS.test(name)) return 'women';
  return 'men';
}

// ---------------------------------------------------------------------------
// Candidato (linha SPARQL validada)
// ---------------------------------------------------------------------------

const QID = z.string().regex(/^Q\d+$/, 'deve ser Q-ID Wikidata');

/** Linha bruta da query principal (sem labels — o label service dá 504 na forma janelada). */
export const RawWonRowSchema = z.object({
  editionQid: QID,
  motherQid: QID,
  winnerQid: QID,
  year: z.number().int().min(WON_MIN_YEAR).max(2100),
});
export type RawWonRow = z.infer<typeof RawWonRowSchema>;

/** Candidato completo = linha bruta + nome da mãe (da consulta de labels em lote). */
export const WonEdgeCandidateSchema = RawWonRowSchema.extend({
  motherName: z.string().min(1).max(300),
});
export type WonEdgeCandidate = z.infer<typeof WonEdgeCandidateSchema>;

/** Chave estável de dedup em lote — espelha a chave do banco (mãe, ano, clube). */
export function wonEdgeDedupKey(
  c: Pick<WonEdgeCandidate, 'motherQid' | 'year' | 'winnerQid'>,
): string {
  return [c.motherQid, c.year, c.winnerQid].join('|');
}

// ---------------------------------------------------------------------------
// SPARQL — construção e parse
// ---------------------------------------------------------------------------

export interface WonQueryWindow {
  minYear: number;
  maxYear: number;
}

/**
 * Janela de anos → query. Forma validada ao vivo (union-first, filtro nativo
 * de dateTime, sem label service — labels das mães vêm em consulta própria,
 * senão o endpoint responde 504). ORDER BY garante rodada reprodutível (T428).
 */
export function buildWonEdgesQuery(w: WonQueryWindow): string {
  const min = `${w.minYear}-01-01`;
  const max = `${w.maxYear}-12-31`;
  return `SELECT DISTINCT ?edition ?mother ?winner ?year WHERE {
  { ?edition wdt:P585 ?t } UNION { ?edition wdt:P580 ?t } UNION { ?edition wdt:P582 ?t }
  ?edition wdt:P1346 ?winner .
  ?edition wdt:P3450 ?mother .
  ?mother wdt:P31/wdt:P279* wd:${FOOTBALL_COMPETITION_CLASS_QID} .
  FILTER(?t >= "${min}"^^xsd:dateTime && ?t <= "${max}T23:59:59"^^xsd:dateTime)
  BIND(YEAR(?t) AS ?year)
}
ORDER BY ?edition
LIMIT ${WON_PAGE_LIMIT}`;
}

/** Labels de competição-mãe por QID (consulta VALUES-bounded, barata). */
export function buildMotherLabelsQuery(qids: string[]): string {
  const values = qids.map((q) => `wd:${q}`).join(' ');
  return `SELECT ?mother ?motherLabel WHERE {
  VALUES ?mother { ${values} }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

function qidFrom(uri: string): string {
  return uri.split('/').pop() ?? '';
}

/** Parse da resposta SPARQL → linhas brutas válidas; malformadas são descartadas E contadas. */
export function parseWonEdgesResponse(json: unknown): {
  rows: RawWonRow[];
  invalid: number;
} {
  const bindings = (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } })
    ?.results?.bindings;
  if (!bindings) return { rows: [], invalid: 0 };
  const rows: RawWonRow[] = [];
  let invalid = 0;
  for (const b of bindings) {
    const raw = {
      editionQid: qidFrom(b.edition?.value ?? ''),
      motherQid: qidFrom(b.mother?.value ?? ''),
      winnerQid: qidFrom(b.winner?.value ?? ''),
      year: parseInt(b.year?.value ?? '', 10),
    };
    const parsed = RawWonRowSchema.safeParse(raw);
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      invalid += 1;
    }
  }
  return { rows, invalid };
}

/**
 * Enriquece linhas brutas com o label da mãe (mapa QID→nome, da consulta de
 * labels). QID sem label = descartado e contado (nunca fabricar nome).
 */
export function enrichWithMotherLabels(
  rows: RawWonRow[],
  labels: Map<string, string>,
): { candidates: WonEdgeCandidate[]; withoutLabel: number } {
  const candidates: WonEdgeCandidate[] = [];
  let withoutLabel = 0;
  for (const row of rows) {
    const motherName = labels.get(row.motherQid);
    const parsed = WonEdgeCandidateSchema.safeParse({ ...row, motherName });
    if (parsed.success) {
      candidates.push(parsed.data);
    } else {
      withoutLabel += 1;
    }
  }
  return { candidates, withoutLabel };
}

// ---------------------------------------------------------------------------
// Metadata da aresta (hierarquia/gênero congelados na escrita)
// ---------------------------------------------------------------------------

export interface WonEdgeMetadataInput {
  candidate: Pick<WonEdgeCandidate, 'editionQid' | 'year' | 'motherQid' | 'motherName'>;
  /** Referência da mãe NO ACERVO (quando existe) — mais rica que o label Wikidata. */
  motherRef?: {
    qid: string | null;
    name: string | null;
    type: string | null;
    country: string | null;
  };
  importedAt: Date;
}

export interface WonEdgeMetadata {
  year: number;
  season: string;
  hierarchy: RankHierarchy;
  gender: 'men' | 'women';
  editionQid: string;
  dataSource: typeof WON_DATASOURCE;
  sourceUrl: string;
  license: typeof WON_LICENSE;
  importedAt: Date;
}

/**
 * Congela na escrita o que o carrossel vai ler: `hierarchy` resolvida pela
 * MESMA função do ranking (importada, não reimplementada) contra a referência
 * mais rica disponível (acervo > label Wikidata). `sourceUrl` aponta para a
 * EDIÇÃO (não para a mãe) — proveniência por aresta, princípio 1.3.
 */
export function buildWonEdgeMetadata(input: WonEdgeMetadataInput): WonEdgeMetadata {
  const { candidate, motherRef, importedAt } = input;
  const hierarchy = resolveHierarchy(
    motherRef ?? { qid: candidate.motherQid, name: candidate.motherName },
  );
  return {
    year: candidate.year,
    season: String(candidate.year),
    hierarchy,
    gender: resolveGender(motherRef?.name ?? candidate.motherName),
    editionQid: candidate.editionQid,
    dataSource: WON_DATASOURCE,
    sourceUrl: WIKIDATA_ENTITY_URL_BASE + candidate.editionQid,
    license: WON_LICENSE,
    importedAt,
  };
}

/** Hierarquia válida (guard para metadata lido do banco). */
export function isKnownHierarchy(value: unknown): value is RankHierarchy {
  return typeof value === 'string' && (RANKING_HIERARCHIES as readonly string[]).includes(value);
}
