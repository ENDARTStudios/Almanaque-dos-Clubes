import { LOCALE_COUNTRY, type Locale } from '@/i18n/config';
import { FLAG_ASSETS } from '@/lib/flag-assets.generated';
import { FlagImage } from '@/components/CountryFlag';

/**
 * T579b — BANDEIRA DO IDIOMA (seletor de idioma do topo e do rodapé).
 *
 * Antes era emoji (`🇧🇷/🇺🇸/🇪🇸`), que no Windows degrada para as duas letras regionais — o
 * mesmo defeito que a bandeira do acervo tinha. Agora é o MESMO asset próprio
 * (`/flags/<iso2>.svg`, via `FlagImage`), escolhido pelo país que representa o idioma
 * (`LOCALE_COUNTRY`).
 *
 * Decoração pura: `alt=""` + `aria-hidden`. Quem nomeia o idioma é o botão (`aria-label` com
 * o código do locale) e o texto ao lado ("Português (BR)"). Sem arquivo no manifesto, devolve
 * a SIGLA do país em texto — nunca uma bandeira errada.
 */
export function LocaleFlag({ locale }: { locale: Locale }) {
  const code = LOCALE_COUNTRY[locale];
  if (!FLAG_ASSETS[code]) {
    return (
      <span aria-hidden="true" className="text-xs leading-none">
        {code}
      </span>
    );
  }
  return <FlagImage code={code} testId={`locale-flag-${locale}`} />;
}

export default LocaleFlag;
