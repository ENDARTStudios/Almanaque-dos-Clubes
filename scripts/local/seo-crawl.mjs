// Auditoria SEO leve do site público (insumo para decisão do sitemap WS-C-3/T454).
// Polido: sequencial, ~1 req/s, max 500 URLs, 1 retry pós-5s em 5xx/timeout.
// Não usa segredos, não escreve no banco, não usa dependências.
import { writeFileSync } from 'node:fs';

const ORIGIN = 'https://almanaquedosclubes.com';
const MAX_URLS = 500;
const DELAY_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithMeta(url, retry = 1) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'almanaque-seo-audit/1.0 (site próprio; auditoria)' },
    });
    const body = await res.text();
    return { status: res.status, ms: Date.now() - t0, bytes: body.length, body, finalUrl: res.url };
  } catch (err) {
    if (retry > 0) {
      await sleep(5000);
      return fetchWithMeta(url, retry - 1);
    }
    return { status: 0, ms: Date.now() - t0, bytes: 0, body: '', error: String(err).slice(0, 200) };
  }
}

function extract(html, pattern) {
  const m = html.match(pattern);
  return m ? m[1].trim().slice(0, 300) : null;
}

function parsePage(html) {
  return {
    title: extract(html, /<title[^>]*>([^<]*)<\/title>/i),
    metaDescription: extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
      ?? extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    canonical: extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
      ?? extract(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i),
    robotsMeta: extract(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i),
    h1Count: (html.match(/<h1[\s>]/gi) || []).length,
  };
}

// 1. robots.txt
const robots = await fetchWithMeta(`${ORIGIN}/robots.txt`);
const robotsTxt = robots.body || '';
const sitemapLines = [...robotsTxt.matchAll(/Sitemap:\s*(\S+)/gi)].map((m) => m[1]);

// 2. sitemap.xml
const sm = await fetchWithMeta(`${ORIGIN}/sitemap.xml`);
const sitemapUrls = [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
const sitemapLastmod = [...sm.body.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)].map((m) => m[1]);

const pathsInSitemap = sitemapUrls.map((u) => {
  try { return new URL(u).pathname; } catch { return u; }
});
const hasMap = pathsInSitemap.some((p) => p === '/map');
const hasPreview = pathsInSitemap.some((p) => p.startsWith('/preview'));
const hasInternal = pathsInSitemap.some((p) => /admin|internal|dashboard|api\//.test(p));

// 3. amostra para crawl: todas as não-clube até 80 + clubes até completar MAX_URLS
const isNonClub = (p) => !/^\/clubs?\//.test(p) && !/^\/competitions?\//.test(p);
const nonClub = pathsInSitemap.filter(isNonClub).slice(0, 80);
const rest = pathsInSitemap.filter((p) => !isNonClub(p));
const sample = [...new Set([...nonClub, ...rest])].slice(0, MAX_URLS - 5);
// páginas-chave garantidas fora do sitemap
const extra = ['/', '/map', '/preview/mapa', '/rankings', '/metodologia', '/sitemap.xml'];
const toCrawl = [...new Set([...sample, ...extra])].slice(0, MAX_URLS);

console.log(`robots.txt: ${robots.status}; sitemaps declarados: ${sitemapLines.length}; URLs no sitemap: ${sitemapUrls.length}; amostra+categorias: ${toCrawl.length}`);

// 4. crawl sequencial
const results = [];
let i = 0;
for (const path of toCrawl) {
  i++;
  const url = path.startsWith('http') ? path : `${ORIGIN}${path}`;
  const r = await fetchWithMeta(url);
  const page = r.status === 200 ? parsePage(r.body) : {};
  const rec = {
    path,
    status: r.status,
    ms: r.ms,
    bytes: r.bytes,
    ...page,
    error: r.error ?? null,
  };
  results.push(rec);
  process.stdout.write(`[${i}/${toCrawl.length}] ${r.status} ${r.ms}ms ${path}\n`);
  await sleep(DELAY_MS);
}

const summary = {
  origin: ORIGIN,
  crawledAt: new Date().toISOString(),
  robotsStatus: robots.status,
  sitemapsInRobots: sitemapLines,
  sitemapStatus: sm.status,
  sitemapUrlCount: sitemapUrls.length,
  sitemapHasMap: hasMap,
  sitemapHasPreviewMapa: hasPreview,
  sitemapHasInternalRoutes: hasInternal,
  crawled: results.length,
  byStatus: results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {}),
  errors: results.filter((r) => r.status >= 400 || r.status === 0),
  missingTitle: results.filter((r) => r.status === 200 && !r.title),
  missingMetaDescription: results.filter((r) => r.status === 200 && !r.metaDescription),
  duplicateTitles: Object.entries(
    results.reduce((acc, r) => {
      if (r.title) acc[r.title] = (acc[r.title] || 0) + 1;
      return acc;
    }, {}),
  ).filter(([, n]) => n > 1),
  canonicalMismatches: results.filter(
    (r) => r.canonical && r.canonical !== `${ORIGIN}${r.path}` && r.canonical.split('?')[0] !== `${ORIGIN}${r.path}`,
  ),
  noindex: results.filter((r) => r.robotsMeta && /noindex/i.test(r.robotsMeta)),
  slowOver2s: results.filter((r) => r.ms > 2000),
};

writeFileSync('/tmp/seo-audit-results.json', JSON.stringify({ summary, results }, null, 2));
console.log('\n=== SUMÁRIO ===');
console.log(JSON.stringify(summary, (k, v) => (k === 'errors' || k.startsWith('missing') || k === 'canonicalMismatches' || k === 'noindex' || k === 'slowOver2s' || k === 'duplicateTitles' ? (Array.isArray(v) ? v.map((x) => x.path) : v) : v), 2));
