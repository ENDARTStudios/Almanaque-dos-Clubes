/**
 * Carregando — o esqueleto da lista de competições.
 *
 * O Next renderiza este arquivo enquanto a página espera o fetch. Sem ele, a navegação mostra a
 * tela anterior congelada até a resposta chegar e o usuário não sabe se clicou.
 *
 * O esqueleto tem SEIS linhas porque a lista tem densidade de tabela: um spinner central não
 * comunica a forma do que está vindo, e o salto de layout quando o conteúdo chega é maior.
 *
 * O locale é lido do MESMO cookie das páginas — não fixo em pt-br. Uma tela de carregamento em
 * português num site em espanhol é o mesmo defeito que a `admin/error.tsx` corrigiu no boundary
 * de erro: a interface é traduzida, a moldura da interface também precisa ser.
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
      <SkeletonFicha rows={6} label={fichaStrings[locale].states.loading} />
    </div>
  );
}
