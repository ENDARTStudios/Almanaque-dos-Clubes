/**
 * T507 (W5) — connector da Wikipedia REST API para texto editorial.
 *
 * Fonte: `{lang}.wikipedia.org/api/rest_v1/page/summary/{title}` (CC-BY-SA 3.0,
 * atribuição obrigatória já documentada no pacote legal).
 *
 * Honestidade: só grava o que a Wikipedia devolve; artigo ausente ⇒ idioma
 * omitido do payload (a UI mostra "em catalogação", nunca texto inventado).
 */
import { z } from 'zod';

export const EDITORIAL_USER_AGENT =
  'AlmanaqueDosClubes/0.1 (wikipedia editorial enrich; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
export const EDITORIAL_LANGS = ['pt', 'en', 'es'] as const;
export type EditorialLang = (typeof EDITORIAL_LANGS)[number];
export const EDITORIAL_LICENSE = 'CC-BY-SA-3.0';

const summaryShape = z
  .object({
    extract: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    content_urls: z
      .object({ desktop: z.object({ page: z.string().optional() }).optional() })
      .optional(),
  })
  .passthrough();

export interface EditorialEntry {
  extract: string;
  description: string | null;
  sourceUrl: string;
}

/** Sitelinks por idioma extraídos do Wikidata (`{lang}wiki` → título). */
export function sitelinksFromEntity(entity: {
  sitelinks?: Record<string, { title?: string } | undefined>;
}): Partial<Record<EditorialLang, string>> {
  const out: Partial<Record<EditorialLang, string>> = {};
  for (const lang of EDITORIAL_LANGS) {
    const title = entity.sitelinks?.[`${lang}wiki`]?.title;
    if (title) out[lang] = title;
  }
  return out;
}

/** Normaliza o payload da REST API; `type: disambiguation` é rejeitado. */
export function parseSummary(json: unknown): EditorialEntry | null {
  const parsed = summaryShape.safeParse(json);
  if (!parsed.success) return null;
  const { extract, description, type, content_urls } = parsed.data;
  if (!extract || extract.trim().length < 40) return null; // resumo curto demais = ruído
  if (type === 'disambiguation') return null; // página de desambiguação não é o clube
  const sourceUrl = content_urls?.desktop?.page;
  if (!sourceUrl) return null;
  return { extract: extract.trim(), description: description ?? null, sourceUrl };
}

/** Busca o summary de um título num idioma. 404 ⇒ null (artigo ausente). */
export async function fetchSummary(
  lang: EditorialLang,
  title: string,
  opts: { userAgent?: string; fetchImpl?: typeof globalThis.fetch } = {},
): Promise<EditorialEntry | null> {
  const { userAgent = EDITORIAL_USER_AGENT, fetchImpl = globalThis.fetch } = opts;
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const res = await fetchImpl(url, {
    headers: { 'user-agent': userAgent, Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wikipedia ${lang} HTTP ${res.status}`);
  return parseSummary(await res.json());
}

/** Monta o payload editorial buscando cada idioma disponível (sequencial, 1 req/s). */
export async function buildEditorial(
  titles: Partial<Record<EditorialLang, string>>,
  opts: {
    userAgent?: string;
    fetchImpl?: typeof globalThis.fetch;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<Partial<Record<EditorialLang, EditorialEntry>> | null> {
  const { sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)) } = opts;
  const out: Partial<Record<EditorialLang, EditorialEntry>> = {};
  let first = true;
  for (const lang of EDITORIAL_LANGS) {
    const title = titles[lang];
    if (!title) continue;
    if (!first) await sleep(1000);
    first = false;
    try {
      const entry = await fetchSummary(lang, title, opts);
      if (entry) out[lang] = entry;
    } catch {
      // idioma falhou — segue com os outros (nunca inventa)
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}
