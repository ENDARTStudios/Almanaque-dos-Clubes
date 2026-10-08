import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import PageHeading from '@/components/PageHeading';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

// Mapeamento do portal (Operador, 08/10) — área "Mercado da Bola".
// HONESTIDADE: transferências/rumores/valores exigem fontes próprias que ainda
// não integramos — a página declara "em breve" e aponta o que JÁ existe no
// acervo (redes/torcedores nos perfis). Nada de dado inventado.

export const metadata: Metadata = {
  title: 'Mercado da Bola',
  description:
    'Transferências, rumores e valores de mercado: área em breve. O Almanaque publica apenas dados com proveniência verificada.',
};

export default async function MercadoDaBolaPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const m = dict.pages.market;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.market.title" subtitleKey="pages.market.subtitle" />

      <div className="mt-8 max-w-2xl space-y-4" data-testid="market-soon">
        <p className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {`🚧 ${m.emBreve}`}
        </p>
        <p className="text-foreground/80">{m.body}</p>
        <p className="text-sm text-foreground/70">{m.bodyCta}</p>
        <Link
          href="/clubs"
          className="inline-block px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {m.cta}
        </Link>
      </div>
    </div>
  );
}
