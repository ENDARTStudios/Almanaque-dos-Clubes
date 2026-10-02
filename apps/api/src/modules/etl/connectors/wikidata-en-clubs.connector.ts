/**
 * T449EN — Conector de clubes de futebol ingleses (Wikidata, CC0) para completar
 * a base do piloto T449a. FUNÇÕES PURAS (o I/O fica no script).
 *
 * Dedup por QID (chave canônica). Nomes: normalização p/ MATCH (não é chave) —
 * remove acentos, pontuação e sufixos legais ("F.C.", "A.F.C.", "Football Club").
 */
import { z } from 'zod';

export const WIKIDATA_EN_DATASOURCE = 'wikidata-en-piloto';
export const WIKIDATA_LICENSE = 'CC0';

export const EnClubSchema = z.object({
  qid: z.string().regex(/^Q\d+$/),
  label: z.string().min(1),
  labelPt: z.string().min(1).optional(),
  country: z.string().length(2).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
});
export type EnClub = z.infer<typeof EnClubSchema>;

/** Normaliza nome de clube para MATCH: minúsculas, sem acento/pontuação/sufixo legal. */
export function normalizeClubName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(football club|f c|a f c|fc|afc|club)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** SPARQL de clubes de futebol na Inglaterra/UK com labels (en/pt) + fundação. */
export function buildEnClubsQuery(limit = 3000, offset = 0): string {
  return `
SELECT ?qid ?label ?labelPt ?iso2 ?inception WHERE {
  ?club wdt:P641 wd:Q2736 .  # esporte = futebol de associação
  ?club wdt:P17 ?country .
  VALUES ?country { wd:Q145 wd:Q21 }
  ?club rdfs:label ?label . FILTER(lang(?label) = "en")
  OPTIONAL { ?club rdfs:label ?labelPt . FILTER(lang(?labelPt) = "pt") }
  OPTIONAL { ?country wdt:P297 ?iso2 . }
  OPTIONAL { ?club wdt:P571 ?inception . }
  BIND(STRAFTER(STR(?club), "entity/") AS ?qid)
}
LIMIT ${limit} OFFSET ${offset}`.trim();
}

interface Binding {
  [k: string]: { value: string } | undefined;
}

/** Parseia os bindings do SPARQL → EnClub[] (dedup por QID, Zod por linha). */
export function parseEnClubs(json: unknown): EnClub[] {
  const bindings = ((json as { results?: { bindings?: Binding[] } })?.results?.bindings ??
    []) as Binding[];
  const byQid = new Map<string, EnClub>();
  for (const b of bindings) {
    const year = b.inception?.value ? new Date(b.inception.value).getUTCFullYear() : undefined;
    const candidate = {
      qid: b.qid?.value ?? '',
      label: b.label?.value ?? '',
      labelPt: b.labelPt?.value,
      country: b.iso2?.value?.toUpperCase(),
      foundedYear: Number.isFinite(year) ? year : undefined,
    };
    const parsed = EnClubSchema.safeParse(candidate);
    if (parsed.success && !byQid.has(parsed.data.qid)) byQid.set(parsed.data.qid, parsed.data);
  }
  return [...byQid.values()];
}

/** Casa nomes-alvo (RSSSF) com clubes por nome normalizado. Retorna nome→QID. */
export function matchByNormalizedName(
  targets: string[],
  clubs: EnClub[],
): {
  matched: Record<string, string>;
  missing: string[];
} {
  const byNorm = new Map<string, string>();
  for (const c of clubs) {
    byNorm.set(normalizeClubName(c.label), c.qid);
    if (c.labelPt) byNorm.set(normalizeClubName(c.labelPt), c.qid);
  }
  const matched: Record<string, string> = {};
  const missing: string[] = [];
  for (const t of targets) {
    const qid = byNorm.get(normalizeClubName(t));
    if (qid) matched[t] = qid;
    else missing.push(t);
  }
  return { matched, missing };
}

export function wikidataEntityUrl(qid: string): string {
  return `https://www.wikidata.org/wiki/${qid}`;
}

/** URL de busca (wbsearchentities) — fallback para nomes não resolvidos no SPARQL. */
export function buildSearchUrl(name: string): string {
  return `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(name)}`;
}

/** Escolhe o 1º resultado cuja descrição indica clube de futebol. Puro. */
export function pickClubFromSearch(json: unknown): string | null {
  const hits = ((json as { search?: Array<{ id?: string; description?: string }> })?.search ??
    []) as Array<{
    id?: string;
    description?: string;
  }>;
  const hit = hits.find(
    (h) => h.id && /football club|association football club/i.test(h.description ?? ''),
  );
  return hit?.id ?? null;
}
