'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { PLAN_FEATURES } from '@/lib/plan-features';
import { formatPrice, PLAN_CENTS, yearlyCents, type BillingCurrency } from '@/lib/pricing';

// T472a — resumo pré-confirmação do checkout, i18n pt/en/es. Consome a FONTE
// ÚNICA (plan-features.ts) por locale — sem lista paralela (anti-hardcode T465).
//
// T555 — os Termos (seção 5) prometem que o checkout exiba, ANTES da confirmação:
// preço total do período, periodicidade, desconto, tributos, meio de pagamento,
// fornecedor, data da cobrança seguinte, renovação, cancelamento e arrependimento.
// Preço e desconto vêm de `lib/pricing` (a MESMA fonte que o botão que faz o
// redirect) e as datas chegam prontas do SERVIDOR — sem relógio no cliente, logo
// sem risco de o HTML do servidor divergir do hidratado.
export default function CheckoutSummary({
  currency = 'BRL',
  nextChargeMonthlyIso,
  nextChargeYearlyIso,
}: {
  currency?: BillingCurrency;
  nextChargeMonthlyIso?: string;
  nextChargeYearlyIso?: string;
} = {}) {
  const { dict, locale } = useI18n();
  const c = dict.checkout;
  const features = PLAN_FEATURES[locale] ?? PLAN_FEATURES['pt-br'];

  const formatarData = (iso?: string): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    try {
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC', // data-calendário pura: não desloca por fuso
      }).format(d);
    } catch {
      return d.toISOString().slice(0, 10); // locale exótico não quebra a tela
    }
  };
  const dataMensal = formatarData(nextChargeMonthlyIso);
  const dataAnual = formatarData(nextChargeYearlyIso);

  const planos = (['PRO', 'ELITE'] as const).map((plano) => ({
    nome: plano === 'PRO' ? 'Pro' : 'Elite',
    mensal: formatPrice(currency, PLAN_CENTS[plano], locale),
    anual: formatPrice(currency, yearlyCents(PLAN_CENTS[plano]), locale),
  }));

  const linha = (rotulo: string, valor: string) => (
    <div className="flex flex-wrap gap-x-2">
      <dt className="font-semibold text-foreground">{rotulo}:</dt>
      <dd className="text-foreground/80">{valor}</dd>
    </div>
  );

  return (
    <>
      <h1 className="text-3xl font-heading font-bold mb-2">{c.title}</h1>
      <p className="text-foreground/70 mb-6">{c.intro}</p>

      {/* T555 — o resumo que os Termos prometem ANTES da confirmação */}
      <h2 className="text-lg font-heading font-semibold text-foreground mb-3">{c.summaryTitle}</h2>
      <dl className="rounded-xl border border-border p-6 mb-8 text-sm space-y-1.5">
        {linha(
          c.priceLabel,
          `${c.monthlyWord}: ${planos.map((p) => `${p.nome} ${p.mensal}`).join(' · ')} — ${
            c.yearlyWord
          }: ${planos.map((p) => `${p.nome} ${p.anual}`).join(' · ')}`,
        )}
        {linha(c.discountLabel, c.discountValue)}
        {linha(c.taxesLabel, c.taxesValue)}
        {linha(c.methodLabel, c.methodValue)}
        {linha(c.providerLabel, c.providerValue)}
        {(dataMensal || dataAnual) &&
          linha(
            c.nextChargeLabel,
            [
              dataMensal ? `${c.monthlyWord}: ${dataMensal}` : null,
              dataAnual ? `${c.yearlyWord}: ${dataAnual}` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          )}
        {linha(c.renewalLabel, c.renewalValue)}
      </dl>

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
            <a className="underline" href="mailto:endart.studios+reembolso@gmail.com">
              endart.studios+reembolso@gmail.com
            </a>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border p-6 mb-8 text-sm">
        <p className="font-semibold text-foreground mb-2">{c.includedTitle}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {(['PRO', 'ELITE'] as const).map((plan) => (
            <div key={plan}>
              <p className="font-semibold text-primary-ink mb-1">{plan}</p>
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
