/**
 * Carregando — esqueleto de a tabela de rankings.
 *
 * O Next renderiza este arquivo enquanto a página espera o fetch. Sem ele a tela anterior fica
 * congelada e o usuário não sabe se clicou. O locale vem do mesmo cookie das páginas.
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
