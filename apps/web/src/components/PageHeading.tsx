'use client';
import { useI18n } from '@/i18n/Provider';

export default function PageHeading({
  titleKey,
  subtitleKey,
  subtitleParams,
}: {
  titleKey: string;
  subtitleKey?: string;
  subtitleParams?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  return (
    <>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">{t(titleKey)}</h1>
      {subtitleKey ? (
        <p className="text-foreground/60 mb-8">{t(subtitleKey, subtitleParams)}</p>
      ) : null}
    </>
  );
}
