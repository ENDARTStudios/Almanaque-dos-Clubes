// T507 (W5) — seção "Sobre" no perfil do clube + strings i18n.
const fs = require('fs');

// 1. wsC2 strings: adiciona bloco about nos 3 idiomas
{
  const p = 'apps/web/src/i18n/wsC2.ts';
  let s = fs.readFileSync(p, 'utf8');
  const marker = 'carousel:';
  if (!s.includes(marker)) { console.error('wsC2 anchor miss'); process.exit(1); }
  // injeta `about: {...}` antes de carousel em cada locale
  const counts = { pt: 0, en: 0, es: 0 };
  s = s.replace(/('pt-br': \{)/, (m) => m);
  const about = {
    "pt-br": "{ aboutTitle: 'Sobre', aboutSource: 'Fonte: Wikipédia', aboutCataloging: 'Descrição em catalogação (sem artigo na Wikipédia).', ",
    "en-us": "{ aboutTitle: 'About', aboutSource: 'Source: Wikipedia', aboutCataloging: 'Description being catalogued (no Wikipedia article).', ",
    "es-es": "{ aboutTitle: 'Acerca de', aboutSource: 'Fuente: Wikipedia', aboutCataloging: 'Descripción en catalogación (sin artículo en Wikipedia).', ",
  };
  for (const [loc, inject] of Object.entries(about)) {
    const re = new RegExp(`("?${loc}"?:\\s*)\\{`, 'm');
    if (!re.test(s)) { console.error('locale anchor miss: ' + loc); process.exit(1); }
    s = s.replace(re, `$1${inject}`);
    counts[loc.split('-')[0]]++;
  }
  fs.writeFileSync(p, s);
  console.log('wsC2 about:', JSON.stringify(counts));
}

// 2. página do clube: interface + seção renderizada
{
  const p = 'apps/web/src/app/clubs/[id]/page.tsx';
  let s = fs.readFileSync(p, 'utf8');
  let fails = 0;
  const rep = (from, to, l) => { if (!s.includes(from)) { console.error('MISS ' + l); fails = 1; return; } s = s.replace(from, to); };

  rep(
    `  infobox?: Record<string, string> | null;`,
    `  infobox?: Record<string, string> | null;
  /** T507 — texto editorial por idioma (Wikipedia, CC-BY-SA). */
  editorial?: Record<string, { extract?: string; sourceUrl?: string } | null> | null;`,
    'interface',
  );

  rep(
    `      <ClubTimeline clubId={club.id} locale={locale} />`,
    `      {/* T507 (W5) — Sobre: texto editorial (Wikipedia CC-BY-SA) com fallback honesto. */}
      {(() => {
        const ed = club.editorial ?? null;
        const entry = ed?.[locale] ?? ed?.pt ?? ed?.en ?? ed?.es ?? null;
        const extract = entry?.extract ?? null;
        const sourceUrl = entry?.sourceUrl ?? null;
        return (
          <section aria-labelledby="club-about" className="mt-10" data-testid="club-about">
            <h2 id="club-about" className="text-xl font-heading font-semibold mb-3">
              {s.aboutTitle}
            </h2>
            {extract ? (
              <>
                <p className="text-sm leading-relaxed text-foreground/80">{extract}</p>
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-foreground/50 hover:text-primary underline decoration-dotted underline-offset-2"
                  >
                    {s.aboutSource}
                  </a>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-foreground/50">{s.aboutCataloging}</p>
            )}
          </section>
        );
      })()}

      <ClubTimeline clubId={club.id} locale={locale} />`,
    'section',
  );
  fs.writeFileSync(p, s);
  console.log(fails ? 'PAGE FALHAS' : 'page ok');
}
