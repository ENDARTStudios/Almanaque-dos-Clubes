'use client';
import { useI18n } from '@/i18n/Provider';

export default function ComingSoon() {
  const { t } = useI18n();
  return (
    <div className="mt-12 text-center text-foreground/40 py-12 border-2 border-dashed border-border rounded-2xl">
      <p className="text-lg">{t('common.comingSoonTitle')}</p>
      <p className="text-sm mt-1">{t('common.comingSoonDesc')}</p>
    </div>
  );
}
