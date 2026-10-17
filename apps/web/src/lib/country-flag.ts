/**
 * T579b — BANDEIRA DO PAÍS como ASSET PRÓPRIO servido do nosso domínio.
 *
 * HISTÓRICO, porque a decisão anterior foi revertida com medição: a bandeira nasceu EMOJI
 * derivado do ISO2 (PR #681), e o argumento era "sem asset, sem licença para auditar".
 * O que aquele caminho não media é o RENDER: emoji de bandeira só existe no macOS/iOS. No
 * Windows — sistema do dono e da maioria do público doméstico — o usuário via as duas
 * LETRAS REGIONAIS ("IT"), ou seja, o dado sumia justamente onde mais gente olha. A
 * decisão do dono é que a bandeira seja SEMPRE visível e que o asset venha do Commons.
 *
 * Consequências, e é isto que este módulo materializa:
 *
 * 1. **A bandeira é um ARQUIVO nosso** (`/flags/<iso2>.svg|.png`), adquirido do Wikimedia
 *    Commons pelo P41 do Wikidata e com licença auditada POR ARQUIVO
 *    (`apps/api/src/scripts/data/flags-provenance.json`). Nenhuma CDN de terceiro serve
 *    asset em runtime — nem `flagcdn.com` (que o T579 tinha removido e o `next.config`
 *    ainda permitia).
 *
 * 2. **Quem diz se há bandeira é o MANIFESTO** (`flag-assets.generated.ts`), gerado pelo
 *    script de aquisição a partir da tabela `countries` do acervo (`iso2` + `qid` → P41 →
 *    arquivo do Commons). Não existe mais heurística de "código é região?" para decidir
 *    bandeira: a lista é o dado, não uma regra de adivinhação. Código sem arquivo (dado
 *    sujo como `BR1`, país sem P41, falha de download) cai para a SIGLA EM TEXTO — bandeira
 *    errada continua sendo pior que bandeira ausente.
 *
 * 3. **O nome do país em texto é resolvido por ICU, não por um mapa escrito à mão.**
 *    `Intl.DisplayNames` com o locale do usuário devolve "Itália"/"Italy"/"Italia" para
 *    "IT". Um mapa de ~250 países em três idiomas seria dado nosso, desatualizável.
 *
 * 4. **Código RETIRADO da ISO 3166-1 não recebe o nome do Estado sucessor.** Medido no
 *    acervo (223 códigos distintos em clubes/jogadores): três países que não existem mais
 *    continuam nos dados — `DD` (Alemanha Oriental), `YU` (Iugoslávia) e `AN` (Antilhas
 *    Holandesas). O CLDR do ICU devolve, para eles, o nome do SUCESSOR ("Alemanha",
 *    "Sérvia", "Curaçao"). Num acervo HISTÓRICO, chamar de "Alemanha" um clube da DDR é dado
 *    errado, então `WITHDRAWN_ISO2` desliga o NOME e o rótulo volta a ser a própria sigla.
 *    A BANDEIRA, porém, esses três TÊM: os itens históricos do Wikidata (`Q16957`, `Q36704`,
 *    `Q25227`) declaram P41, e a bandeira de época é informação CORRETA para eles.
 */

interface DisplayNamesLike {
  of(code: string): string | undefined;
}

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

/** Código ISO2 normalizado (maiúsculas) ou `null` quando não é um par de letras. */
export function toIso2(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
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
