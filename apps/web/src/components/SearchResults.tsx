'use client';
import { useI18n } from '@/i18n/Provider';

export function SearchResults({ query }: { query: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-8 p-6 bg-background rounded-xl border border-border/50">
      <p className="text-sm text-foreground/60">
        {t('common.resultsFor')} <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
      </p>
      <p className="text-sm text-foreground/40 mt-2">{t('common.resultsNote')}</p>
    </div>
  );
}
