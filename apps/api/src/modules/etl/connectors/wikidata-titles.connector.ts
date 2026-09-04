/**
 * T420 — Conector Wikidata (títulos/campeões de ligas nacionais) → TitleCandidate.
 *
 * Estratégia: para cada competição de liga (QID), busca os itens "sports season of
 * the league" (P3450 = ?season) e o vencedor de cada temporada via P1346 (winner).
 * Devolve vínculo clube(QID) + competição + ano (temporada/título).
 *
 * Usa exclusivamente Wikidata (CC0), User-Agent identificado, e é idempotente
 * (a mesma entrada → mesmos candidatos). Nenhum dado é fabricado: se um QID de
 * competição não tiver temporadas/vencedores cadastrados, não retorna nada.
 */
import { z } from 'zod';

export const TitleCandidateSchema = z.object({
  clubQid: z.string().regex(/^Q\d+$/, 'clubQid deve ser Q-ID'),
  competitionQid: z.string().regex(/^Q\d+$/, 'competitionQid deve ser Q-ID'),
  year: z.number().int().nonnegative(),
  clubName: z.string().min(1),
  competitionName: z.string().min(1),
});
export type TitleCandidate = z.infer<typeof TitleCandidateSchema>;

export interface TitlesFetchOptions {
  competitionQids: string[];
  minYear: number;
  maxYear: number;
  userAgent: string;
}

const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikidata titles ingest; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';

/** Monta a consulta SPARQL de campeões para uma lista de QIDs de liga. */
export function buildTitlesQuery(
  opts: Pick<TitlesFetchOptions, 'competitionQids' | 'minYear' | 'maxYear'>,
): string {
  const values = opts.competitionQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT DISTINCT ?comp ?compLabel ?season ?year ?winner ?winnerLabel WHERE {
  VALUES ?comp { ${values} }
  ?comp wdt:P3450 ?season .          # sports season of the league
  ?season wdt:P1346 ?winner .        # winner / campeão
  ?season wdt:P577 ?start .
  BIND(YEAR(?start) AS ?year)
  FILTER(?year >= ${opts.minYear} && ?year <= ${opts.maxYear})
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;
}

/** Converte Q-URI → QID. */
function qidFrom(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1].replace(/^Q/, 'Q');
}

/** Faz o parse da resposta JSON SPARQL → TitleCandidate[]. Linhas malformadas são descartadas (não fabricadas). */
export function parseTitlesResponse(json: unknown): TitleCandidate[] {
  const bindings = (json as { results?: { bindings?: Array<Record<string, { value?: string }>> } })
    ?.results?.bindings;
  if (!bindings) return [];
  const out: TitleCandidate[] = [];
  for (const b of bindings) {
    if (!b.winner?.value || !b.comp?.value || !b.year?.value) continue;
    const year = parseInt(b.year.value, 10);
    if (Number.isNaN(year)) continue;
    const candidate = {
      clubQid: qidFrom(b.winner.value),
      competitionQid: qidFrom(b.comp.value),
      year,
      clubName: b.winnerLabel?.value || b.winner.value,
      competitionName: b.compLabel?.value || b.comp.value,
    };
    const parsed = TitleCandidateSchema.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Busca os campeões de várias ligas via SPARQL (concorrência 1, User-Agent identificado). */
export async function fetchChampions(opts: TitlesFetchOptions): Promise<TitleCandidate[]> {
  const url =
    'https://query.wikidata.org/sparql?query=' +
    encodeURIComponent(buildTitlesQuery(opts)) +
    '&format=json';
  const res = await globalThis.fetch(url, {
    headers: {
      'user-agent': opts.userAgent || USER_AGENT,
      Accept: 'application/sparql-results+json',
    },
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  return parseTitlesResponse(json);
}
