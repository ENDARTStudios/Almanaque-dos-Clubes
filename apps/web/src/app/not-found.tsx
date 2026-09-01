'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { LOCALE_NAMES, type Locale } from '@/i18n/config';

export default function NotFoundPage() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="flex items-center justify-end gap-2 text-sm text-foreground/50 mb-2">
        {(['pt-br', 'en-us', 'es-es'] as Locale[]).map((l) => (
          <button key={l} onClick={() => setLocale(l)} className={locale === l ? 'font-semibold text-primary' : 'hover:text-primary'}>
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </div>
      <div className="text-8xl font-heading font-bold text-primary/20 mb-4">404</div>
      <h1 className="text-4xl font-heading font-bold text-foreground mb-4">{t('common.notFoundTitle')}</h1>
      <p className="text-foreground/60 mb-8">{t('common.notFoundDesc')}</p>
      <Link href="/" className="bg-primary text-on-primary px-6 py-3 rounded-lg text-base font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer">
        {t('common.backHome')}
      </Link>
    </div>
  );
}
