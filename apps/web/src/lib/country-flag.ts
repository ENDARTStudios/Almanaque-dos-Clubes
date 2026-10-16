/**
 * T579 — BANDEIRA DE PAÍS derivada do código ISO 3166-1 alpha-2 do acervo.
 *
 * Duas decisões que este módulo materializa:
 *
 * 1. **A bandeira é derivada, não baixada.** O acervo guarda `country` como ISO2
 *    (`Club.country @db.VarChar(2)`, `Player.country`, `Competition.country`). Da sigla
 *    ISO2 a bandeira é CALCULÁVEL: os símbolos regionais Unicode são o bloco
 *    U+1F1E6..U+1F1FF mapeado em A..Z, então "IT" → 🇮🇹 sem asset, sem CDN de terceiro e
 *    sem arquivo de licença para auditar. O projeto já usava emoji de bandeira nesse
 *    papel (`LOCALE_FLAGS` em `i18n/config.ts`) e o `CountryFlag` anterior buscava PNG em
 *    `flagcdn.com` — dependência externa de terceiro para asset, que é o que se evita
 *    aqui (item 19: nada de CDN de terceiro para a bandeira).
 *
 *    Custo declarado: em plataformas sem glifos de bandeira (Windows, que só desenha as
 *    duas letras regionais) o usuário vê "IT" no lugar da bandeira. Isso é degradação
 *    HONESTA — mostra a sigla ISO, nunca uma bandeira errada.
 *
 * 2. **O nome do país em texto é resolvido por ICU, não por um mapa escrito à mão.**
 *    `Intl.DisplayNames` com o locale do usuário devolve "Itália"/"Italy"/"Italia" para
 *    "IT". Um mapa de ~250 países em três idiomas seria dado nosso, desatualizável; o ICU
 *    entrega o nome oficial no idioma do usuário.
 *
 * 3. **Código que não é região não vira bandeira.** Medido: o ICU trata `ZZ` como o
 *    pseudo-país ISO "Unknown or unspecified" e devolve "Região desconhecida" — e a
 *    derivação regional daria o par 🇿🇿, que não é bandeira de lugar nenhum. Por isso
 *    existe `isRegionCode`: ele compara o nome do código com o do `ZZ` e, quando iguais,
 *    trata como NÃO mapeado. Nesse caso o chamador mostra a sigla em TEXTO. Bandeira
 *    errada é pior que bandeira ausente, e "região desconhecida" é exatamente o que a
 *    sigla diz.
 *
 * 4. **Código RETIRADO da ISO 3166-1 não recebe o nome do Estado sucessor.** Medido no
 *    acervo (SQL em produção, 223 códigos distintos): três países que não existem mais
 *    continuam nos dados — `DD` (Alemanha Oriental), `YU` (Iugoslávia) e `AN` (Antilhas
 *    Holandesas). O CLDR do ICU devolve, para eles, o nome do SUCESSOR ("Alemanha",
 *    "Sérvia", "Curaçao") e o emoji não tem glifo de bandeira (nenhum desses pares está no
 *    conjunto RGI do Unicode). Num acervo HISTÓRICO, chamar de "Alemanha" um clube da DDR é
 *    dado errado — então `WITHDRAWN_ISO2` desliga nome e bandeira para esses códigos e o
 *    rótulo volta a ser a própria sigla, que é o que o dado diz.
 */

/** Bloco dos "regional indicators": A → U+1F1E6, B → U+1F1E7, … */
const REGIONAL_INDICATOR_A = 0x1f1e6;

/**
 * Códigos de países RETIRADOS da ISO 3166-1 que ainda existem no acervo (medido: `AN`,
 * `DD`, `YU` — os três). São códigos que NÃO foram reatribuídos a outro país: `SK`, por
 * exemplo, saiu de Sikkim e hoje é Eslováquia, então fica de fora desta lista de propósito.
 * Para estes, o nome do sucessor que o CLDR daria seria informação errada.
 */
const WITHDRAWN_ISO2 = new Set([
  'AN', // Antilhas Holandesas — dissolvidas em 2010
  'BU', // Birmânia
  'CS', // Checoslováquia / Sérvia e Montenegro
  'DD', // Alemanha Oriental
  'DY', // Daomé
  'FX', // França metropolitana
  'HV', // Alto Volta
  'NH', // Novas Hébridas
  'RH', // Rodésia
  'SU', // União Soviética
  'TP', // Timor Leste (Timor Português)
  'VD', // Vietnã do Norte
  'WK', // Ilha Wake
  'YD', // Iêmen Democrático
  'YU', // Iugoslávia
  'ZR', // Zaire
]);

interface DisplayNamesLike {
  of(code: string): string | undefined;
}

/** Código ISO2 normalizado (maiúsculas) ou `null` quando não é um par de letras. */
export function toIso2(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * Emoji de bandeira do código (`'it'` → `'🇮🇹'`) ou `null` se o código não for ISO2.
 *
 * PURA de propósito: ela não sabe se a região EXISTE. Quem decide desenhar é o chamador,
 * que combina esta função com `isRegionCode` (ver o item 3 do cabeçalho).
 */
export function flagEmoji(value?: string | null): string | null {
  const code = toIso2(value);
  if (!code) return null;
  const points = [...code].map((letter) => REGIONAL_INDICATOR_A + (letter.charCodeAt(0) - 65));
  return String.fromCodePoint(...points);
}

function makeDisplayNames(locale: string): DisplayNamesLike | null {
  const ctor = (
    Intl as unknown as {
      DisplayNames?: new (locales: string, options: object) => DisplayNamesLike;
    }
  ).DisplayNames;
  if (typeof ctor !== 'function') return null;
  try {
    return new ctor(locale, { type: 'region', fallback: 'none' });
  } catch {
    return null;
  }
}

/**
 * Nome do país no idioma pedido, via ICU — ou `null` quando o código não é uma região
 * conhecida (o placeholder "Região desconhecida"/"Unknown Region" do `ZZ` conta como não
 * conhecida: quem chama mostra a sigla, não uma frase sobre o desconhecido).
 */
export function countryName(value: string | null | undefined, locale: string): string | null {
  const code = toIso2(value);
  if (!code) return null;
  // Código retirado da ISO: a sigla é mais honesta que o nome do Estado sucessor.
  if (WITHDRAWN_ISO2.has(code)) return null;
  const dn = makeDisplayNames(locale);
  if (!dn) return null;
  try {
    const name = dn.of(code);
    if (typeof name !== 'string') return null;
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.toUpperCase() === code) return null;
    // `ZZ` é o pseudo-país ISO de "desconhecido": se o nome é o mesmo, o código não mapeia
    // nenhum país real e o rótulo também não deve ser o placeholder.
    if (trimmed === dn.of('ZZ')) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * O código corresponde a uma região com bandeira? `false` desliga a bandeira e deixa o
 * texto (sigla) fazer o trabalho.
 *
 * Usa `'en'` de propósito: o placeholder de região desconhecida existe em todos os idiomas,
 * então um único idioma basta para a comparação — e não amarra o resultado ao locale do
 * usuário. Sem `Intl.DisplayNames` no runtime não há como checar: nesse caso devolvemos
 * `true` (o ISO2 do acervo é a melhor informação disponível; a bandeira é derivada dele).
 */
export function isRegionCode(value?: string | null): boolean {
  const code = toIso2(value);
  if (!code) return false;
  // Retirado da ISO: sem nome confiável e sem glifo de bandeira (não estão no RGI do Unicode).
  if (WITHDRAWN_ISO2.has(code)) return false;
  const dn = makeDisplayNames('en');
  if (!dn) return true;
  try {
    const name = dn.of(code);
    if (typeof name !== 'string' || name.trim().length === 0) return false;
    return name.trim() !== dn.of('ZZ');
  } catch {
    return true;
  }
}

/**
 * Texto de país para exibir quando NÃO há bandeira: nome no idioma do usuário, ou o
 * código, ou o valor cru que veio do acervo. Nunca string vazia (perder o país é perder
 * acervo) — e nunca um nome chutado a partir de código desconhecido.
 */
export function countryLabel(value: string | null | undefined, locale: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return countryName(value, locale) ?? toIso2(value) ?? value.trim();
}

/** Destino do país numa listagem que já aceita `?country=` (`/clubs`, `/players`, `/competitions`). */
export function countryHref(basePath: string, value: string): string | null {
  const code = toIso2(value);
  if (!code) return null;
  return `${basePath}?country=${encodeURIComponent(code)}`;
}
