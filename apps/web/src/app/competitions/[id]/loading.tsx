/**
 * Carregando — o esqueleto da ficha da competição.
 *
 * A ficha tem doze blocos; um spinner central não prepara o olho para nenhum deles. O esqueleto
 * de oito linhas aproxima a densidade real da página.
 */
import { cookies } from 'next/headers';
import { SkeletonFicha } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

export default async function Loading() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <SkeletonFicha rows={8} label={fichaStrings[locale].states.loading} />
    </div>
  );
}
