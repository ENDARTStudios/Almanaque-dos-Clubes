import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { flagLabel, type WT579Strings } from '@/i18n/wsT579';
import { countryHref, countryName, flagEmoji, isRegionCode, toIso2 } from '@/lib/country-flag';

/**
 * T579 (ITEM 19) — BANDEIRA DO PAÍS do acervo.
 *
 * O que este componente resolve, e o que ele RECUSA a resolver:
 *
 * - A bandeira vem da SIGLA ISO2 do dado (`lib/country-flag`), sem CDN de terceiro. Código
 *   que não é ISO2 (ou país sem glifo no sistema) não vira bandeira nenhuma: vira TEXTO.
 *   Bandeira errada é pior que bandeira ausente.
 * - Bandeira sozinha não é rótulo. Sem destino, o nome do país no idioma do usuário aparece
 *   em TEXTO ao lado dela; com destino, o `aria-label` do link carrega o nome do país
 *   ("Ver clubes: Itália"), porque a sigla de duas letras não basta para leitor de tela.
 * - O clique só existe quando há destino REAL: `basePath` + `destination` apontam para uma
 *   listagem que já aceita `?country=` (`/clubs`, `/players`, `/competitions`). Sem os dois,
 *   o componente renderiza texto — não um link que não leva a lugar nenhum.
 * - Alvo de toque ≥ 24 px (WCAG 2.2 · 2.5.8) no modo link: `min-h-6 min-w-6`.
 *
 * TAMANHO do texto: o componente NÃO fixa `text-*` no wrapper — ele herda do contexto (a
 * célula da tabela, o chip de `text-xs`, o cartão de `text-sm`). Fixar aqui criaria conflito
 * de mesmo peso: `text-xs` e `text-sm` são duas classes de uma classe só, e quem vence é a
 * ordem do CSS, não a ordem do atributo — o resultado seria tamanho imprevisível conforme o
 * chamador.
 *
 * Uso decorativo (a bandeira ao lado de um texto que JÁ diz o país — o cartão do índice de
 * países, por exemplo) passa `showName={false}` e é lido como decoração: o emoji sai
 * `aria-hidden` e quem informa o país é o texto vizinho.
 */
export function CountryFlag({
  code,
  locale,
  name,
  basePath,
  destination,
  showName,
  className = '',
}: {
  /** Valor cru do acervo (`Club.country`, `Player.country`…), tipicamente ISO2. */
  code?: string | null;
  /** Idioma do usuário — resolve o nome do país via ICU e o rótulo do link. */
  locale: Locale;
  /** Nome já resolvido pelo chamador (ex.: índice de países), quando existir. */
  name?: string | null;
  /** Base da listagem relacionada que aceita `?country=` — sem ela não há clique. */
  basePath?: string | null;
  /** Qual listagem o clique abre; compõe o nome acessível do link. */
  destination?: keyof WT579Strings['flag'];
  /** Mostrar o nome ao lado da bandeira. Padrão: sim sem link, não com link. */
  showName?: boolean;
  className?: string;
}) {
  if (typeof code !== 'string' || code.trim().length === 0) return null;

  const iso = toIso2(code);
  /**
   * A bandeira só é desenhada quando o código é uma REGIÃO de verdade (`isRegionCode`):
   * código sem país real — `ZZ`/`XX` de dado sujo, ou retirado da ISO (`DD`, `YU`, `AN`, que
   * ainda existem no acervo) — cai para TEXTO. Medido nos 223 códigos do acervo: 220 têm
   * bandeira, 3 caem para a sigla.
   */
  const emoji = isRegionCode(code) ? flagEmoji(code) : null;
  const named = name?.trim() || countryName(code, locale);
  const text = named ?? iso ?? code.trim();
  const href = iso && basePath && destination ? countryHref(basePath, iso) : null;
  const withName = showName ?? !href;

  const flag = emoji ? (
    <span aria-hidden="true" className="text-base leading-none">
      {emoji}
    </span>
  ) : null;

  if (href && destination) {
    return (
      <Link
        href={href}
        aria-label={flagLabel(locale, destination, text)}
        data-testid="country-flag-link"
        className={`inline-flex min-h-6 min-w-6 items-center justify-center gap-1.5 rounded-sm text-primary-ink hover:underline ${className}`}
      >
        {flag}
        {withName ? <span>{text}</span> : null}
      </Link>
    );
  }

  return (
    <span
      data-testid="country-flag"
      className={`inline-flex items-center gap-1.5 text-foreground/70 ${className}`}
    >
      {flag}
      {withName ? <span>{text}</span> : null}
    </span>
  );
}

export default CountryFlag;
