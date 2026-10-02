'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { LOCALE_NAMES, type Locale } from '@/i18n/config';

export default function LegalDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t, dict, locale, setLocale } = useI18n();
  const doc = dict.legal[kind];

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
        {doc.title}
      </h1>
      <p className="text-sm text-foreground/50 mb-8">
        {/* T469 — versão/data POR documento (vinham hardcoded e compartilhados). */}
        {t('legal.updatedLabel')}: {doc.updated ?? '2026-09-19'} ({doc.version ?? 'v1.2'}) · END ART
        Studios · CNPJ 45.370.930/0001-75
      </p>
      <p className="text-foreground/70 mb-8 leading-relaxed">{doc.intro}</p>

      <div className="space-y-8">
        {doc.sections.map((section) => (
          <section
            key={section.title}
            id={section.title
              .replace(/^\d+\.\s*/, '')
              .toLowerCase()
              .replace(/\s+/g, '-')}
          >
            <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
              {section.title}
            </h2>
            {section.body.map((para, i) => (
              <p key={i} className="text-foreground/70 mb-2 leading-relaxed">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
