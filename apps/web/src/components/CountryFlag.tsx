import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { flagLabel, type WT579Strings } from '@/i18n/wsT579';
import { FLAG_ASSETS } from '@/lib/flag-assets.generated';
import { countryHref, countryLabel, toIso2 } from '@/lib/country-flag';

/** Altura da bandeira em px — o mesmo número que a classe `h-4` aplica. */
export const ALTURA_BANDEIRA = 16;

/** Classe de altura correspondente (Tailwind não lê constante em tempo de build). */
const ALTURA_CLASSE = 'h-4';

/**
 * A IMAGEM da bandeira — o único lugar do app que desenha um `<img>` de bandeira (o
 * `LocaleFlag` do seletor de idioma reusa esta função, para não existirem duas réguas de
 * tamanho/decoração).
 *
 * Regras fixas: asset do manifesto pelo ISO2 (`null` quando não há — quem chama decide o
 * texto), proporção real via `width`/`height` calculados (nada de caixa 3:2 deformando a
 * Suíça) e decoração pura (`alt=""` + `aria-hidden`), porque o país vem do texto vizinho.
 *
 * DUAS MEDIDAS, as duas de produção (auditoria de 16/10), e as duas viraram classe aqui:
 *
 * 1. **`max-w-none` — a bandeira encolhia para 12,63 px.** O preflight do Tailwind aplica
 *    `img { max-width: 100% }`; dentro de um controle de 24 px (a bandeira do seletor de
 *    idioma do rodapé), o `max-width` vencia a largura do arquivo e o `object-contain`
 *    letterboxava: 24 ÷ 1,9 = **12,63 px** de altura para uma bandeira de razão 1,9 como a dos
 *    EUA, abaixo do piso de 16 px. Com `max-width: none`, a largura passa a ser a do manifesto.
 * 2. **`width` arredondado PARA CIMA.** Com `Math.round`, uma razão como 1,9 dava 30 px para
 *    16 px de altura (30 ÷ 1,9 = 15,79 px de conteúdo) — de novo abaixo do piso, e por menos
 *    de um pixel, que é o tipo de reprovação que ninguém vê. `Math.ceil` garante conteúdo
 *    ≥ 16 px em qualquer razão.
 */
export function FlagImage({
  code,
  className = '',
  testId = 'country-flag-img',
}: {
  code?: string | null;
  className?: string;
  testId?: string;
}) {
  const iso = toIso2(code);
  const asset = iso ? FLAG_ASSETS[iso] : undefined;
  if (!asset) return null;
  return (
    <img
      src={asset.src}
      alt=""
      aria-hidden="true"
      width={Math.ceil(ALTURA_BANDEIRA * asset.ratio)}
      height={ALTURA_BANDEIRA}
      loading="lazy"
      decoding="async"
      data-testid={testId}
      className={`${ALTURA_CLASSE} w-auto max-w-none shrink-0 rounded-[2px] object-contain ring-1 ring-border/40 ${className}`}
    />
  );
}

/**
 * T579b (ITEM 19) — BANDEIRA DO PAÍS do acervo, servida do nosso domínio.
 *
 * O que este componente resolve, e o que ele RECUSA a resolver:
 *
 * - A bandeira é um arquivo nosso (`/flags/<iso2>.svg|.png`), adquirido do Wikimedia
 *   Commons pelo P41 do Wikidata. O que existe está no manifesto gerado
 *   (`flag-assets.generated.ts`) — nada de emoji (que no Windows degrada para as duas letras
 *   regionais) e nada de CDN de terceiro.
 * - Código sem arquivo — dado sujo (`BR1`), país que a aquisição rejeitou por licença ou
 *   QID sem P41 — cai para a SIGLA EM TEXTO. Bandeira errada é pior que bandeira ausente.
 * - Bandeira sozinha não é rótulo. Sem destino, o nome do país no idioma do usuário aparece
 *   em TEXTO ao lado dela; com destino, o `aria-label` do link carrega o nome do país
 *   ("Ver clubes: Itália"), porque a sigla de duas letras não basta para leitor de tela.
 *   O texto vem SEMPRE de `countryLabel` (ICU pelo ISO2) — nunca do `name` da tabela
 *   `countries`, que é referência em inglês. Era esse o defeito medido: o cartão do índice de
 *   países mostrava "Spain" e a linha logo abaixo, "Espanha".
 * - `<img alt="">` + `aria-hidden`: a imagem é DECORAÇÃO em todos os modos. Quem informa o
 *   país é o texto ao lado (ou o `aria-label` do link) — o mesmo contrato que o emoji tinha,
 *   agora sem depender de glifo do sistema.
 * - O clique só existe quando há destino REAL: `basePath` + `destination` apontam para uma
 *   listagem que já aceita `?country=` (`/clubs`, `/players`, `/competitions`). Sem os dois,
 *   o componente renderiza texto — não um link que não leva a lugar nenhum.
 * - Alvo de toque ≥ 24 px (WCAG 2.2 · 2.5.8) no modo link: `min-h-6 min-w-6`.
 *
 * TAMANHO: a bandeira tem 16 px de altura (`h-4`) e a LARGURA vem da proporção real do
 * arquivo (3:2, 5:3, 2:1, 1:1 — cada país tem a sua). Esticar tudo para uma caixa 3:2
 * distorceria a Suíça e o Nepal; por isso `width`/`height` são atributos calculados do
 * manifesto e o `h-4 w-auto` deixa o CSS mandar. O anel sutil de borda (`ring-border/40`)
 * é o que separa do fundo escuro as bandeiras claras (Japão, Chipre).
 *
 * O componente NÃO fixa `text-*` no wrapper — ele herda do contexto (a célula da tabela, o
 * chip de `text-xs`, o cartão de `text-sm`). Fixar aqui criaria conflito de mesmo peso.
 */
export function CountryFlag({
  code,
  locale,
  basePath,
  destination,
  showName,
  className = '',
}: {
  /** Valor cru do acervo (`Club.country`, `Player.country`…), tipicamente ISO2. */
  code?: string | null;
  /** Idioma do usuário — resolve o nome do país via ICU e o rótulo do link. */
  locale: Locale;
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
  const asset = iso ? FLAG_ASSETS[iso] : undefined;
  // Um caminho só para o texto visível e para o nome acessível (ver `countryLabel`).
  const text = countryLabel(code, locale) ?? code.trim();
  const href = iso && basePath && destination ? countryHref(basePath, iso) : null;
  const withName = showName ?? !href;

  const flag = asset ? <FlagImage code={iso} /> : null;

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
