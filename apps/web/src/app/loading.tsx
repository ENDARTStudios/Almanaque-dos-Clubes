/**
 * Carregando da raiz — neutro de propósito.
 *
 * ── POR QUE NÃO UM ESQUELETO DE TABELA ─────────────────────────────────────────────────────
 * Um esqueleto de 6 linhas comunica "vem uma lista". Isso está certo nas rotas que JÁ têm o
 * próprio `loading.tsx` (competições, clubes, jogadores, rankings, lendas, mapa, partidas) —
 * lá a forma do esqueleto corresponde à forma do conteúdo.
 *
 * As outras 41 rotas são majoritariamente institucionais (sobre, metodologia, privacidade,
 * termos) e páginas de formulário. Um esqueleto de tabela ali seria a promessa errada: o usuário
 * veria 6 barras e receberia um texto. Então a raiz desenha só uma barra fina — o sinal mínimo
 * de "está carregando", sem afirmar qual forma vem.
 *
 * ── ACESSIBILIDADE ────────────────────────────────────────────────────────────────────────
 * `role="status"` com texto `sr-only`: o leitor de tela anuncia o carregamento. A barra em si é
 * `aria-hidden` — uma animação de progresso não é conteúdo.
 */
import { cookies } from 'next/headers';
import { fichaStrings } from '@/i18n/wsFicha';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

export default async function Loading() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <span role="status" className="sr-only">
        {fichaStrings[locale].states.loading}
      </span>
      <div aria-hidden="true" className="h-0.5 w-full overflow-hidden rounded bg-surface-2">
        <div className="h-full w-1/3 animate-pulse rounded bg-primary" />
      </div>
    </div>
  );
}
