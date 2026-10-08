/**
 * T450 Wave 8 — INFBOX DA WIKIPÉDIA PT como fonte padrão substituta do
 * Wikidata limitado (DECISÃO 10-07: Wikipedia PT aprovada como fonte primária
 * substituta; scraping autorizado com proveniência por registro).
 *
 * Para cada clube com QID: sitelink ptwiki (wbgetentities, 50/lote) → artigo →
 * template {{Info/<Artigo>}} → subpágina Predefinição:Info/<Artigo> → campos
 * (nomeabrev, alcunhas, mascote, estádio, capacidade, fundadoem/fundação,
 * local, presidente, treinador, site) → zero-overwrite no acervo:
 *   - shortName/website/foundedYear só quando NULL;
 *   - metadata.infobox = {alcunhas, mascote, estadio, capacidade, presidente,
 *     treinador, local} + sourceUrl + fonte='wikipedia-pt'.
 *
 * Uso: tsx src/scripts/enrich-clubs-infobox-wikipedia.ts [--apply] [--limit=N] [--qid=Q35933]
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const LIMIT =
  Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0) || 2000;
const SINGLE_QID = process.argv.find((a) => a.startsWith('--qid='))?.split('=')[1];
const UA = 'AlmanaqueDosClubes-ETL/3.0 (github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const METHOD_VERSION = 't450-w8-wikipedia-infobox-v1';

const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  await throttle();
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) {
        await sleep(2 ** attempt * 2000);
        return fetchJson<T>(url, attempt + 1);
      }
      throw new Error(`HTTP ${res.status}: ${url.slice(0, 120)}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url.slice(0, 120)}`);
    const text = await res.text();
    if (text.startsWith('You are making too many requests')) {
      if (attempt < 3) {
        await sleep(2 ** attempt * 2000);
        return fetchJson<T>(url, attempt + 1);
      }
      throw new Error('rate limit persistente da MediaWiki');
    }
    return JSON.parse(text) as T;
  } catch (err) {
    if (attempt < 3 && !(err instanceof Error && err.message.startsWith('HTTP 4'))) {
      await sleep(2 ** attempt * 1000);
      return fetchJson<T>(url, attempt + 1);
    }
    throw err;
  }
}

const mwApi = (params: Record<string, string>): string =>
  `https://pt.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;

// ---------------------------------------------------------------------------
// Limpeza de valores wikitext
// ---------------------------------------------------------------------------
export function cleanWikitextValue(raw: string): string {
  let s = raw;
  s = s.replace(/<ref[^>]*\/>/gi, '');
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  s = s.replace(/<br\s*\/?\s*>/gi, ' · ');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/\{\{formatnum:([^}]+)\}\}/gi, '$1');
  s = s.replace(/\{\{Data de lançamento\|(\d{4})[^}]*\}\}/gi, '$1');
  s = s.replace(/\{\{Data de fundação\|(\d{4})[^}]*\}\}/gi, '$1');
  s = s.replace(/\{\{[Nn]owrap\|([^}]*)\}\}/g, '$1');
  s = s.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2');
  s = s.replace(/'{2,5}/g, '');
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[ ·]+$/, '')
    .trim();
}

/** Campos de interesse normalizados (chave canônica minúscula → valor limpo). */
export function parseInfoboxFields(templateWikitext: string): Record<string, string> {
  const out: Record<string, string> = {};
  const fieldRe = /^\s*\|\s*([a-zà-ú _0-9]+)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\}|$)/gim;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(templateWikitext)) !== null) {
    const key = m[1]!.trim().toLowerCase();
    if (
      ['modelo', 'imagem', 'img', 'res_img', 'imagem_legenda', 'current', 'rankingnac'].includes(
        key,
      )
    )
      continue;
    const clean = cleanWikitextValue(m[2] ?? '');
    if (clean && clean.length >= 2 && !out[key]) out[key] = clean;
  }
  return out;
}

export interface InfoboxInfo {
  shortName?: string;
  website?: string;
  foundedYear?: number;
  estadio?: string;
  capacidade?: string;
  alcunhas?: string;
  mascote?: string;
  presidente?: string;
  treinador?: string;
  local?: string;
}

/** Campos do infobox → info estruturada (apenas os reconhecidos). */
export function fieldsToInfo(fields: Record<string, string>): InfoboxInfo {
  const info: InfoboxInfo = {};
  const abbrev = fields['nomeabrev'] ?? fields['nome abreviado'] ?? fields['nomeabreviado'];
  if (abbrev) info.shortName = abbrev;
  const site = fields['site'] ?? fields['website'] ?? fields['url'];
  if (site && /^https?:\/\//.test(site)) info.website = site.split(' ')[0]!;
  const foundedRaw =
    fields['fundadoem'] ?? fields['fundação'] ?? fields['fundado'] ?? fields['fundada'];
  if (foundedRaw) {
    const y = /(\d{4})/.exec(foundedRaw);
    if (y) info.foundedYear = Number(y[1]);
  }
  if (fields['estádio'] ?? fields['estadio'])
    info.estadio = (fields['estádio'] ?? fields['estadio'])!;
  if (fields['capacidade']) info.capacidade = fields['capacidade'];
  if (fields['alcunhas'] ?? fields['alcunha'])
    info.alcunhas = (fields['alcunhas'] ?? fields['alcunha'])!;
  if (fields['mascote']) info.mascote = fields['mascote'];
  if (fields['presidente']) info.presidente = fields['presidente'];
  if (fields['treinador'] ?? fields['técnico'] ?? fields['tecnico']) {
    info.treinador = (fields['treinador'] ?? fields['técnico'] ?? fields['tecnico'])!;
  }
  if (fields['local']) info.local = fields['local'];
  return info;
}

interface WikidataSitelink {
  entities: Record<string, { sitelinks?: Record<string, { title: string }> }>;
}

async function sitelinkForQids(qids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    const d = await fetchJson<WikidataSitelink>(
      `https://www.wikidata.org/w/api.php?${new URLSearchParams({
        action: 'wbgetentities',
        ids: batch.join('|'),
        props: 'sitelinks',
        sitefilter: 'ptwiki',
        format: 'json',
        formatversion: '2',
      })}`,
    );
    for (const [qid, ent] of Object.entries(d.entities ?? {})) {
      const pt = ent.sitelinks?.ptwiki?.title;
      if (pt) out[qid] = pt;
    }
  }
  return out;
}

async function fetchArticleAndTemplate(title: string): Promise<Record<string, string> | null> {
  const body = await fetchJson<{ parse?: { wikitext: string } }>(
    mwApi({ action: 'parse', page: title, prop: 'wikitext' }),
  );
  const wt = body.parse?.wikitext;
  if (!wt) return null;
  // 1º template {{Info/...}} do artigo
  const m = /\{\{(Info\/[^|}]+)/.exec(wt);
  if (!m) return null;
  const templateName = m[1]!.trim();
  // campos inline?
  const inline = parseInfoboxFields(wt.slice(wt.indexOf(`{{${templateName}`)));
  if (Object.keys(inline).length >= 3) return inline;
  // subpágina Predefinição:Info/<Artigo>
  const tpl = await fetchJson<{ parse?: { wikitext: string } }>(
    mwApi({ action: 'parse', page: `Predefinição:${templateName}`, prop: 'wikitext' }),
  );
  const twt = tpl.parse?.wikitext;
  if (!twt) return null;
  return parseInfoboxFields(twt);
}

async function main(): Promise<void> {
  console.log(
    `T450 wave 8 — infobox Wikipedia PT como fonte padrão (${APPLY ? 'APPLY' : 'DRY-RUN'}, limit=${LIMIT})`,
  );

  const where = SINGLE_QID
    ? { qid: SINGLE_QID, deletedAt: null }
    : {
        deletedAt: null,
        qid: { not: null },
        OR: [{ shortName: null }, { foundedYear: null }],
      };
  const clubs = await prisma.club.findMany({
    where,
    select: {
      id: true,
      qid: true,
      name: true,
      website: true,
      shortName: true,
      foundedYear: true,
      metadata: true,
    },
    orderBy: { createdAt: 'asc' },
    take: SINGLE_QID ? 1 : LIMIT,
  });
  console.log(`  alvos (qid + campos vazios): ${clubs.length}`);

  const qids = clubs.map((c) => c.qid!).filter((q): q is string => !!q);
  console.log('  sitelinks ptwiki...');
  const sitelinks = await sitelinkForQids(qids);
  console.log(`  sitelinks obtidos: ${Object.keys(sitelinks).length}`);

  let enriched = 0;
  let noArticle = 0;
  let noFields = 0;
  let processed = 0;

  for (const club of clubs) {
    if (processed >= LIMIT) break;
    processed += 1;
    const qid = club.qid;
    if (!qid) continue;
    const article = sitelinks[qid];
    if (!article) {
      noArticle += 1;
      continue;
    }
    try {
      const fields = await fetchArticleAndTemplate(article);
      if (!fields || Object.keys(fields).length < 2) {
        noFields += 1;
        continue;
      }
      const info = fieldsToInfo(fields);
      const sourceUrl = wikiUrl(article);

      const patch: Record<string, unknown> = {};
      const meta = (club.metadata as Record<string, unknown> | null) ?? {};
      const infoboxMeta: Record<string, unknown> = {
        fonte: 'wikipedia-pt',
        sourceUrl,
        method: METHOD_VERSION,
      };
      if (!club.shortName && info.shortName) patch.shortName = info.shortName;
      if (!club.website && info.website) patch.website = info.website;
      if (club.foundedYear == null && info.foundedYear) patch.foundedYear = info.foundedYear;
      for (const key of [
        'estadio',
        'capacidade',
        'alcunhas',
        'mascote',
        'presidente',
        'treinador',
        'local',
      ] as const) {
        const v = info[key];
        if (v && meta[key] === undefined) infoboxMeta[key] = v;
      }
      infoboxMeta.article = article;
      patch.metadata = {
        ...(meta as Record<string, unknown>),
        infobox: infoboxMeta,
      } as Prisma.InputJsonValue;

      if (APPLY) {
        await prisma.club.update({ where: { id: club.id }, data: patch });
      }
      enriched += 1;
      if (enriched <= 8) {
        console.log(
          `  ${club.name}: short=${info.shortName ?? '-'} fund=${info.foundedYear ?? '-'} estádio=${info.estadio ?? '-'} pres=${info.presidente ?? '-'}`,
        );
      }
    } catch (err) {
      console.log(`  ! ${club.name}: ${(err as Error).message.slice(0, 80)}`);
    }
    // throttle está em fetchJson; margem extra a cada 25
    if (processed % 25 === 0) await sleep(500);
  }

  console.log(
    `resumo: processados=${processed} enriquecidos=${enriched} semArtigo=${noArticle} semCampos=${noFields}`,
  );
  if (!APPLY) console.log('DRY-RUN — nada gravado.');
}

function wikiUrl(title: string): string {
  return `https://pt.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

main()
  .catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
