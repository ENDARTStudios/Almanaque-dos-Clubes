import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { safeJsonLd } from '@/lib/json-ld';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';
import { wsApoiadoresStrings } from '@/i18n/wsApoiadores';
import { formatCount } from '@/lib/format';

/**
 * T-28 — /apoiadores: landing de apoio em Gancho → Promessa → PROVA → CTA.
 *
 * Server component (padrão `/legends`): a PROVA é lida da API no servidor e vai
 * real no HTML — mesmo contrato da home (`?limit=1` → total) e do `/legends`
 * (`titlesCounted`). Falha → lacuna declarada ("em catalogação"); NUNCA número
 * estimado. Nenhum valor de plano/cota nesta página: o billing real é Stripe e
 * mora em /planos; instituições e marcas usam os aliases reais do Operador
 * (mesmo padrão do +contato do rodapé).
 *
 * Copy: skill `conversion-copy` — gancho emocional (memória/pertencimento), a fonte
 * aparece como garantia DEPOIS, um único CTA primário na dobra.
 */

/** Totais públicos do acervo — mesmos endpoints da hero da home. */
interface ArchiveProof {
  clubs: number | null;
  players: number | null;
  matches: number | null;
  titles: number | null;
  rankings: number | null;
  competitions: number | null;
}

async function getProof(): Promise<ArchiveProof> {
  const out: ArchiveProof = {
    clubs: null,
    players: null,
    matches: null,
    titles: null,
    rankings: null,
    competitions: null,
  };
  try {
    const base = getApiBase();
    const [c, p, m, l, r, k] = await Promise.all([
      fetch(`${base}/clubs?limit=1`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${base}/players?limit=1`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${base}/matches?limit=1`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${base}/legends`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${base}/rankings?limit=1`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${base}/competitions?limit=1`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    if (typeof c?.total === 'number') out.clubs = c.total;
    if (typeof p?.total === 'number') out.players = p.total;
    if (typeof m?.total === 'number') out.matches = m.total;
    if (typeof l?.data?.topChampions?.provenance?.titlesCounted === 'number')
      out.titles = l.data.topChampions.provenance.titlesCounted;
    // T-24/28 — Rankings e Competições entram na PROVA: os envelopes de
    // GET /rankings e GET /competitions já devolvem `total` (contagem da
    // listagem inteira, não da página) — mesmo padrão do /clubs.
    if (typeof r?.total === 'number') out.rankings = r.total;
    if (typeof k?.total === 'number') out.competitions = k.total;
  } catch {
    // Lacuna declarada na renderização — nunca estimar.
  }
  return out;
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].supporters;
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: '/apoiadores' },
    openGraph: { title: `${t.title} | Almanaque dos Clubes`, description: t.description },
  };
}

/** Cartão de prova: número real grande + unidade; null → lacuna declarada. */
function ProofCard({
  value,
  unit,
  gapText,
  locale,
}: {
  value: number | null;
  unit: string;
  gapText: string;
  locale: ReturnType<typeof normalizeLocale>;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-muted p-5"
      data-testid="supporter-proof-card"
    >
      {value != null ? (
        <p className="font-heading text-4xl font-bold text-primary-ink">
          {formatCount(value, locale)}
        </p>
      ) : (
        <p className="font-heading text-2xl font-bold text-foreground/70">{gapText}</p>
      )}
      <p className="text-sm text-foreground/70 mt-1">{unit}</p>
    </div>
  );
}

export default async function ApoiadoresPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = wsApoiadoresStrings[locale];
  const proof = await getProof();
  const meta = metadataStrings[locale].supporters;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', name: 'Almanaque dos Clubes' },
  };

  const audiences = [
    {
      id: 'apoiador',
      title: t.supporterTitle,
      body: t.supporterBody,
      steps: t.howSupporter,
      cta: { href: '/planos', label: t.ctaPrimary, kind: 'primary' as const },
      note: t.ctaPrimaryNote,
      testid: 'support-audience-supporter',
    },
    {
      id: 'parceiro',
      title: t.partnerTitle,
      body: t.partnerBody,
      steps: t.howPartner,
      cta: {
        href: 'mailto:endart.studios+parcerias@gmail.com',
        label: t.ctaPartner,
        kind: 'secondary' as const,
      },
      note: null,
      testid: 'support-audience-partner',
    },
    {
      id: 'patrocinador',
      title: t.sponsorTitle,
      body: t.sponsorBody,
      steps: t.howSponsor,
      cta: {
        href: 'mailto:endart.studios+patrocinio@gmail.com',
        label: t.ctaSponsor,
        kind: 'secondary' as const,
      },
      note: t.sponsorNote,
      testid: 'support-audience-sponsor',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      {/* GANCHO — dor/desejo do visitante (memória e pertencimento), não a categoria do produto. */}
      <header className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink">
          {t.heroEyebrow}
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-foreground sm:text-5xl">
          {t.heroTitle}
        </h1>
        {/* PROMESSA — o que a pessoa ganha, simples e direto. */}
        <p className="measure-readable mt-4 text-lg text-foreground/60">{t.heroSubtitle}</p>
        {/* CTA primário — exatamente 1 na dobra. */}
        <div className="mt-6">
          <Link
            href="/planos"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary hover:opacity-90 transition-opacity duration-200"
            data-testid="support-cta-primary"
          >
            {t.ctaPrimary}
          </Link>
          <p className="mt-2 text-xs text-foreground/70">{t.ctaPrimaryNote}</p>
        </div>
      </header>

      {/* PROVA — números reais da API, lidos na renderização ("hoje"). */}
      <section aria-labelledby="proof-title" className="mb-12">
        <h2 id="proof-title" className="mb-1 font-heading text-2xl font-bold sm:text-3xl">
          {t.proofTitle}
        </h2>
        <p className="measure-readable mb-6 text-sm text-foreground/70">{t.proofNote}</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" data-testid="supporter-proof">
          <ProofCard value={proof.clubs} unit={t.proofClubs} gapText={t.proofGap} locale={locale} />
          <ProofCard
            value={proof.players}
            unit={t.proofPlayers}
            gapText={t.proofGap}
            locale={locale}
          />
          <ProofCard
            value={proof.matches}
            unit={t.proofMatches}
            gapText={t.proofGap}
            locale={locale}
          />
          <ProofCard
            value={proof.titles}
            unit={t.proofTitles}
            gapText={t.proofGap}
            locale={locale}
          />
          <ProofCard
            value={proof.rankings}
            unit={t.proofRankings}
            gapText={t.proofGap}
            locale={locale}
          />
          <ProofCard
            value={proof.competitions}
            unit={t.proofCompetitions}
            gapText={t.proofGap}
            locale={locale}
          />
        </div>
      </section>

      {/* TRÊS AUDIÊNCIAS — cada card traz promessa, passos e CTA do próprio caminho. */}
      <section aria-labelledby="audiences-title" className="mb-12">
        <h2 id="audiences-title" className="mb-1 font-heading text-2xl font-bold sm:text-3xl">
          {t.audiencesTitle}
        </h2>
        <p className="measure-readable mb-6 text-foreground/60">{t.audiencesSubtitle}</p>
        <div className="grid gap-4 lg:grid-cols-3">
          {audiences.map((a) => (
            <article
              key={a.id}
              className="flex flex-col rounded-xl border border-border bg-muted p-5 hover:border-primary/60 transition-colors duration-200"
              data-testid={a.testid}
            >
              <h3 className="font-heading text-lg font-bold text-foreground">{a.title}</h3>
              <p className="mt-2 text-sm text-foreground">{a.body}</p>
              <ol className="mt-4 space-y-2 text-sm text-foreground/70">
                {a.steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="font-heading font-bold text-primary-ink shrink-0 w-5 text-center"
                    >
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-1">
                {a.cta.kind === 'primary' ? (
                  <Link
                    href={a.cta.href}
                    className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity duration-200"
                  >
                    {a.cta.label}
                  </Link>
                ) : (
                  <a
                    href={a.cta.href}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-primary-ink hover:border-primary/60 transition-colors duration-200"
                  >
                    {a.cta.label}
                  </a>
                )}
                {a.note ? <p className="mt-2 text-xs text-foreground/70">{a.note}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* TRANSPARÊNCIA — critério aberto; sem promessa de retorno incontrolável. */}
      <section aria-labelledby="transparency-title">
        <h2 id="transparency-title" className="mb-1 font-heading text-2xl font-bold sm:text-3xl">
          {t.transparencyTitle}
        </h2>
        <p className="measure-readable mb-4 text-foreground/60">{t.transparencyBody}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/metodologia"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-primary-ink hover:border-primary/60 transition-colors duration-200"
          >
            {t.transparencyMethodology}
          </Link>
          <Link
            href="/direitos-autorais"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-primary-ink hover:border-primary/60 transition-colors duration-200"
          >
            {t.transparencyRights}
          </Link>
        </div>
      </section>
    </div>
  );
}
