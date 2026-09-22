'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { PLAN_FEATURES } from '@/lib/plan-features';

// T472a — resumo pré-confirmação do checkout, i18n pt/en/es. Consome a FONTE
// ÚNICA (plan-features.ts) por locale — sem lista paralela (anti-hardcode T465).
export default function CheckoutSummary() {
  const { dict, locale } = useI18n();
  const c = dict.checkout;
  const features = PLAN_FEATURES[locale] ?? PLAN_FEATURES['pt-br'];

  return (
    <>
      <h1 className="text-3xl font-heading font-bold mb-2">{c.title}</h1>
      <p className="text-foreground/70 mb-6">{c.intro}</p>
      <div className="rounded-xl border border-border p-6 mb-8 text-sm text-foreground/70">
        <p className="font-semibold text-foreground mb-2">{c.beforeTitle}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link href="/planos" className="underline">
              {c.compare}
            </Link>{' '}
            {c.compareSuffix}
          </li>
          <li>
            <Link href="/termos" className="underline">
              {c.terms}
            </Link>{' '}
            {c.termsMid}{' '}
            <Link href="/privacidade" className="underline">
              {c.privacy}
            </Link>
          </li>
          <li>{c.cancelInfo}</li>
          <li>
            {c.withdrawInfo}{' '}
            <a className="underline" href="mailto:endart.studios@gmail.com">
              endart.studios@gmail.com
            </a>
          </li>
        </ul>
      </div>
      <div className="rounded-xl border border-border p-6 mb-8 text-sm">
        <p className="font-semibold text-foreground mb-2">{c.includedTitle}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {(['PRO', 'ELITE'] as const).map((plan) => (
            <div key={plan}>
              <p className="font-semibold text-primary mb-1">{plan}</p>
              <ul className="list-disc pl-4 text-foreground/70 space-y-0.5">
                {features[plan].map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
