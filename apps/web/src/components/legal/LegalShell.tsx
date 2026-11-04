'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { LOCALE_NAMES, type Locale } from '@/i18n/config';
import { wsConceitoLegal, type LegalTabKey } from '@/i18n/wsConceitoLegal';

/**
 * SHELL LEGAL — a moldura do quadro \`legal\`.
 *
 * Cabeçalho "Legal" + abas dos cinco documentos + "Em uma frase" + navegação "Nesta página" +
 * o documento (children) + histórico/contato. O documento em si continua vindo do dicionário
 * (texto legal real, traduzido); este shell é só a composição.
 */
const TABS: Array<{ key: LegalTabKey; href: string }> = [
  { key: 'privacidade', href: '/privacidade' },
  { key: 'termos', href: '/termos' },
  { key: 'cookies', href: '/cookies' },
  { key: 'direitos', href: '/direitos-autorais' },
  { key: 'lgpd', href: '/direitos-titular' },
];

export default function LegalShell({
  active,
  title,
  updated,
  version,
  sections,
  children,
}: {
  active: LegalTabKey;
  title: string;
  updated?: string;
  version?: string;
  sections: Array<{ id: string; label: string }>;
  children: React.ReactNode;
}) {
  const { locale, setLocale } = useI18n();
  const s = wsConceitoLegal[locale] ?? wsConceitoLegal['pt-br'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{s.kicker}</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-heading text-[40px] leading-[0.98] font-bold text-foreground sm:text-[56px]">
            {s.title}
          </h1>
          <p className="mt-3 max-w-[760px] text-[15px] leading-[23px] text-ink-2">{s.intro}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <span>{s.localeLabel}:</span>
          {(['pt-br', 'en-us', 'es-es'] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={`inline-flex min-h-6 items-center rounded-[2px] px-1.5 ${
                locale === l ? 'font-semibold text-foreground underline' : 'hover:text-foreground'
              }`}
            >
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
      </div>

      <nav aria-label={s.title} className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const current = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={current ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center rounded-[2px] border px-4 text-[13px] font-semibold transition-colors duration-200 ${
                current
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-surface text-ink-2 hover:border-foreground hover:text-foreground'
              }`}
            >
              {s.tabs[tab.key]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t-2 border-foreground pt-6">
        <h2 className="font-heading text-[26px] leading-tight font-bold text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-[11px] text-ink-3">
          {updated || version ? (
            <>
              {s.updatedLabel}
              {updated ? `: ${updated}` : ''}
              {version ? ` (${version})` : ''} ·{' '}
            </>
          ) : null}
          END ART Studios · CNPJ 45.370.930/0001-75
        </p>

        <div className="mt-4 rounded-[2px] border border-border bg-surface-2 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.1em] text-secondary uppercase">
            {s.summaryTitle}
          </p>
          <p className="mt-1 max-w-[900px] text-[13px] leading-[20px] text-ink-2">
            {s.summaries[active]}
          </p>
        </div>

        <div className={`mt-6 grid gap-8 ${sections.length > 0 ? 'lg:grid-cols-[200px_1fr]' : ''}`}>
          {sections.length > 0 ? (
            <aside className="hidden lg:block">
              <p className="text-[10px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
                {s.inPage}
              </p>
              <nav aria-label={s.inPage} className="mt-3">
                <ul className="list-none space-y-0.5 p-0 text-[11px]">
                  {sections.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="block border-b border-border py-1.5 text-ink-2 transition-colors duration-200 hover:text-foreground"
                      >
                        {sec.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          ) : null}

          <div className="min-w-0">{children}</div>
        </div>

        <div className="mt-8 rounded-[2px] bg-surface-2 px-4 py-4">
          <h2 className="text-[12.5px] font-semibold text-foreground">{s.historyTitle}</h2>
          <p className="mt-1 max-w-[900px] text-[12px] leading-[18px] text-ink-2">
            {s.historyBody}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-ink-3">{s.contactBody}</p>
        </div>

        <p className="mt-6 max-w-[900px] border-t border-border pt-3 text-[11px] leading-snug text-ink-3">
          {s.note}
        </p>
      </div>
    </div>
  );
}
