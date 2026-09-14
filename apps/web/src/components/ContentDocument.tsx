'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { LOCALE_NAMES, type Locale } from '@/i18n/config';
import { formatPrice, PLAN_CENTS, type BillingCurrency } from '@/lib/pricing';

export type DocNamespace =
  'sobre' | 'planos' | 'seguranca' | 'cookiePolicy' | 'ia' | 'termosAssinatura';

export default function ContentDocument({
  namespace,
  currency,
}: {
  namespace: DocNamespace;
  currency?: BillingCurrency;
}) {
  const { t, dict, locale, setLocale } = useI18n();
  const doc = dict.pages[namespace];

  // Cabeçalhos da tabela de inventário (Política de Cookies), localizados.
  const inventoryHeaders =
    'inventoryHeaders' in doc && doc.inventoryHeaders
      ? doc.inventoryHeaders
      : ['Cookie', 'Finalidade', 'Categoria', 'Duração', 'Forma'];

  // Substitui tokens de preço pela moeda da localização real (nunca pelo idioma).
  const withPrices = (text: string): string => {
    if (!currency) return text;
    return text
      .replaceAll('{free}', formatPrice(currency, PLAN_CENTS.FREE, locale))
      .replaceAll('{proMonthly}', formatPrice(currency, PLAN_CENTS.PRO, locale))
      .replaceAll('{eliteMonthly}', formatPrice(currency, PLAN_CENTS.ELITE, locale));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-primary hover:underline">
          {t('common.backHome')}
        </Link>
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          {(['pt-br', 'en-us', 'es-es'] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={locale === l ? 'font-semibold text-primary' : 'hover:text-primary'}
            >
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
        {withPrices(doc.title)}
      </h1>
      <p className="text-foreground/70 mb-8 leading-relaxed">{withPrices(doc.intro)}</p>
      <div className="space-y-8">
        {doc.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
              {withPrices(section.title)}
            </h2>
            {section.body.map((para, i) => (
              <p key={i} className="text-foreground/70 mb-2 leading-relaxed">
                {withPrices(para)}
              </p>
            ))}
          </section>
        ))}
        {/* T436 — inventário real de cookies (Política de Cookies). */}
        {'inventory' in doc && doc.inventory && doc.inventory.length > 0 ? (
          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
              {'inventoryTitle' in doc && doc.inventoryTitle ? doc.inventoryTitle : 'Cookies'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-foreground/5 text-left">
                    {inventoryHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doc.inventory.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{row.name}</td>
                      <td className="px-3 py-2">{row.purpose}</td>
                      <td className="px-3 py-2">{row.category}</td>
                      <td className="px-3 py-2">{row.duration}</td>
                      <td className="px-3 py-2">{row.form}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
      {'note' in doc && doc.note ? (
        <p className="mt-8 text-sm text-foreground/50 border-t border-border pt-4">
          {withPrices(doc.note)}
        </p>
      ) : null}
    </div>
  );
}
