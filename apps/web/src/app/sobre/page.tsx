import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { formatCount } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wsConceitoSobre } from '@/i18n/wsConceitoSobre';

export const metadata: Metadata = {
  title: 'Sobre nós | Almanaque dos Clubes',
  description:
    'Conheça o Almanaque dos Clubes, plataforma de pesquisa e organização de informações históricas sobre futebol.',
};

/**
 * /sobre no conceito FICHA — "Um acervo, não um agregador".
 *
 * A página antiga era um documento institucional/legal. O quadro pede a APRESENTAÇÃO do projeto:
 * os quatro totais reais do acervo, o problema, o que fazemos e o que não fazemos, quem faz, como
 * se sustenta, as quatro promessas e a ficha do projeto. A identificação legal (END ART) e o
 * caminho para os termos continuam na página.
 *
 * Totais: cada um vem de um limit=1 (total real). Falha de rede ⇒ o número não aparece; a página
 * não inventa contagem para preencher o layout.
 */
async function totalDe(path: string): Promise<number | undefined> {
  try {
    const r = await fetch(`${getApiBase()}${path}`, { next: { revalidate: 3600 } });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { total?: number };
    return typeof j.total === 'number' ? j.total : undefined;
  } catch {
    return undefined;
  }
}

export default async function SobrePage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = wsConceitoSobre[locale];
  const [clubs, players, competitions, matches] = await Promise.all([
    totalDe('/clubs?limit=1'),
    totalDe('/players?limit=1'),
    totalDe('/competitions?limit=1'),
    totalDe('/matches?limit=1'),
  ]);
  const totais = [
    { label: s.totals.clubs, value: clubs },
    { label: s.totals.players, value: players },
    { label: s.totals.competitions, value: competitions },
    { label: s.totals.matches, value: matches },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{s.kicker}</p>
      <h1 className="mt-4 max-w-[980px] font-heading text-[40px] leading-[0.98] font-bold text-foreground sm:text-[56px]">
        {s.title}
      </h1>
      <p className="mt-4 max-w-[760px] text-[15px] leading-[23px] text-ink-2">{s.intro}</p>

      <dl className="mt-10 grid grid-cols-2 gap-6 border-b border-border pb-8 sm:grid-cols-4">
        {totais.map((t) => (
          <div key={t.label} className="flex flex-col">
            <dt className="order-2 mt-1 text-[11px] text-ink-3">{t.label}</dt>
            <dd className="num order-1 text-[30px] leading-none font-bold text-foreground">
              {t.value != null ? formatCount(t.value, locale) : '—'}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        {s.blocks.map((b) => (
          <section key={b.title}>
            <h2 className="text-[12.5px] font-semibold text-foreground">{b.title}</h2>
            <p className="mt-2 text-[13px] leading-[20px] text-ink-2">{b.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-[12.5px] font-semibold text-foreground">{s.whoTitle}</h2>
        <p className="mt-2 max-w-[860px] text-[13px] leading-[20px] text-ink-2">{s.whoIntro}</p>
        <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-3">
          {s.whoCards.map((c) => (
            <li key={c.title} className="rounded-[2px] bg-surface-2 px-4 py-3">
              <p className="text-[12px] font-semibold text-foreground">{c.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-ink-3">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[12.5px] font-semibold text-foreground">{s.fundingTitle}</h2>
        <p className="mt-2 max-w-[860px] text-[13px] leading-[20px] text-ink-2">{s.fundingIntro}</p>
        <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-3">
          {s.funding.map((c) => (
            <li key={c.title} className="border-t border-border pt-2">
              <p className="text-[12px] font-semibold text-foreground">{c.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-ink-3">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-6 bg-foreground px-5 py-6 text-background sm:grid-cols-2 lg:grid-cols-4">
        {s.promises.map((p) => (
          <div key={p.title}>
            <p className="text-[12px] font-semibold text-background">{p.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-background/70">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-[12.5px] font-semibold text-foreground">{s.sheetTitle}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: s.sheet.name, v: s.sheet.nameValue },
            { k: s.sheet.origin, v: s.sheet.originValue },
            { k: s.sheet.license, v: s.sheet.licenseValue },
            { k: s.sheet.contact, v: s.sheet.contactValue },
          ].map((item) => (
            <div key={item.k}>
              <dt className="text-[10px] font-semibold leading-none text-ink-3">{item.k}</dt>
              <dd className="mt-1 text-[12px] leading-snug text-foreground">{item.v}</dd>
            </div>
          ))}
        </dl>
        <p id="contato" className="mt-6 max-w-[900px] text-[11px] leading-snug text-ink-3">
          {s.operation}{' '}
          <Link
            href="/termos"
            className="text-primary-ink underline decoration-dotted underline-offset-2"
          >
            /termos
          </Link>{' '}
          ·{' '}
          <Link
            href="/privacidade"
            className="text-primary-ink underline decoration-dotted underline-offset-2"
          >
            /privacidade
          </Link>
        </p>
      </section>

      <p className="mt-10 max-w-[900px] border-t border-border pt-3 text-[11px] leading-snug text-ink-3">
        {s.note}
      </p>
    </div>
  );
}
