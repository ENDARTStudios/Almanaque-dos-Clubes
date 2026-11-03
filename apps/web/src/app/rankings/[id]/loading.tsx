/**
 * Carregando — esqueleto do ranking.
 *
 * Um ranking tem dezenas de linhas; o esqueleto de 8 aproxima a densidade real da tabela.
 */
import { cookies } from 'next/headers';
import { SkeletonFicha } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

export default async function Loading() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <SkeletonFicha rows={8} label={fichaStrings[locale].states.loading} />
    </div>
  );
}
