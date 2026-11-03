import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import FichaHead from '@/components/ficha/FichaHead';
import { EmptyState } from '@/components/ficha/States';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

// Mapeamento do portal (Operador, 08/10) — área "Mercado da Bola".
// HONESTIDADE: transferências/rumores/valores exigem fontes próprias que ainda
// não integramos — a página declara "em breve" e aponta o que JÁ existe no
// acervo (redes/torcedores nos perfis). Nada de dado inventado.

export const metadata: Metadata = {
  title: 'Mercado da Bola',
  description:
    'Transferências, rumores e valores de mercado: área em breve. O Almanaque publica apenas dados com proveniência verificada.',
};

export default async function MercadoDaBolaPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const m = dict.pages.market;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <FichaHead title={dict.pages.market.title} subtitle={dict.pages.market.subtitle} />

      <div className="mt-8 max-w-2xl" data-testid="market-soon">
        {/*
          ERA um selo com EMOJI (🚧) + pílula "em breve". Dois defeitos:
            · emoji não é ícone — a skill bane, e ele quebra a tipografia do sistema;
            · "em breve" promete uma data que não existe. A verdade é outra: não há fonte de
              dados de mercado. O acervo não vai inventar transferência para preencher tela.
          O EmptyState diz isso: a lacuna é declarada, com a saída para quem quer continuar.
        */}
        <EmptyState
          title={m.emBreve}
          body={m.body}
          action={
            <Link
              href="/clubs"
              className="inline-flex min-h-11 items-center rounded-lg border border-foreground bg-foreground px-5 text-sm font-semibold text-background transition-colors duration-200 hover:opacity-90"
            >
              {m.bodyCta}
            </Link>
          }
        />
      </div>
    </div>
  );
}
