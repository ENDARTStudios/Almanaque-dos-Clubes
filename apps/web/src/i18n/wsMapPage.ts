import type { Locale } from './config';

/**
 * /map — strings da TELA DO MAPA (módulo ADITIVO, como `wsT579`/`wsCopyright`).
 *
 * Por que um módulo aditivo e não o `Dictionary` global: a regra 4 do design system exige que
 * nenhum texto visível seja literal, e aceita o módulo aditivo (`wsC*.ts`) — o `Dictionary` é
 * editado em paralelo por outras rodadas, e `i18n/types.ts` + os três dicionários num único
 * arquivo de 1.100 linhas é onde o conflito nasce.
 *
 * O DEFEITO MEDIDO (auditoria de 16/10, produção): a `/map` era a única das cinco telas que
 * respondia o MESMO texto nos três idiomas — `h1` "Mapa-múndi" fixo e, abaixo dele, rótulos,
 * atribuição de camadas e listas inteiramente em português ("País", "Fontes deste mapa",
 * "Sem localização"). Em `en-us`/`es-es` o usuário via uma página fora do idioma que escolheu.
 *
 * O que continua FORA daqui, de propósito:
 *  - o `h1`: a frase já existe no dicionário (`home.explore.map` = "Mapa-múndi"/"World
 *    map"/"Mapa mundial") e duplicá-la aqui criaria a segunda régua que este próprio trabalho
 *    combate;
 *  - nome de PAÍS: é dado, e vem do ICU pelo ISO2 (`lib/country-flag`), nunca do dicionário;
 *  - `limitations`: a lista de limitações é GERADA pela API e viaja como dado auditável
 *    (`buildMapViewModel`) — traduzir no cliente seria dizer algo diferente do que a fonte
 *    declara. Fica declarado como dívida de DADO;
 *  - o `<title>`/`<meta description>`: seguem literais em pt, como em TODAS as outras telas do
 *    site (`/players` → "Jogadores", `/competitions` → "Competições").
 */
export interface MapPageStrings {
  /**
   * Resumo da dobra, em segmentos para preservar o `<strong>` do original sem HTML em string
   * (nenhum dicionário do projeto injeta markup).
   */
  intro: Array<{ text: string; strong?: boolean }>;
  /** Rótulo do seletor de país. */
  countryLabel: string;
  /** Toggle do recorte de gênero. */
  womenToggle: string;
  /** Contagem ao lado do seletor: `{n}` com coordenada, `{m}` sem. */
  withCoordinates: string;
  /** Instrução de uso do mapa. */
  hint: string;
  /** Falha declarada ao carregar os pontos. */
  loadError: string;
  /** `aria-label` da seção de atribuição. */
  sourcesAria: string;
  /** Título da seção de atribuição. */
  sourcesTitle: string;
  /** Atribuição OSM (as licenças são nomes próprios e não se traduzem). */
  tiles: string;
  /** Atribuição da base vetorial. */
  vector: string;
  /** Atribuição do Wikidata. */
  wikidata: string;
  /** `aria-label` da lista de clubes plotados. */
  listAria: string;
  /** Título da lista de clubes plotados. */
  listTitle: string;
  /** País selecionado sem nenhum clube com coordenada. */
  noPoints: string;
  /** `aria-label` da seção de clubes sem coordenada. */
  noLocationAria: string;
  /** Título da seção de clubes sem coordenada. */
  noLocationTitle: string;
  /** Lacuna declarada: `{n}` clubes sem coordenada (nunca plotados). */
  noLocationGap: string;
  /** Não há nenhum clube sem coordenada no recorte. */
  noLocationNone: string;
}

export const mapPageStrings: Record<Locale, MapPageStrings> = {
  'pt-br': {
    intro: [
      { text: 'Clubes com coordenada auditável, por país. A ' },
      { text: 'lista', strong: true },
      { text: ' é o caminho principal; o mapa é acessório. Clubes sem coordenada ' },
      { text: 'não', strong: true },
      {
        text: ' são plotados — aparecem no contador de “sem localização” (vazio-honesto). Atribuição por fonte logo abaixo do mapa.',
      },
    ],
    countryLabel: 'País',
    womenToggle: 'Mostrar clubes femininos',
    withCoordinates: '{n} com coordenada · {m} sem localização',
    hint: 'Clique em um país no mapa para selecioná-lo e aproximar · clique em um ponto para ver o clube · botões +/− ou duplo clique para zoom.',
    loadError: 'Não foi possível carregar os pontos agora.',
    sourcesAria: 'Atribuição das fontes',
    sourcesTitle: 'Fontes deste mapa',
    tiles: '© OpenStreetMap contributors — ODbL (tiles da base cartográfica)',
    vector: 'Base vetorial: Natural Earth (domínio público)',
    wikidata: 'Wikidata — CC0 (identidade/atributos)',
    listAria: 'Clubes com coordenada',
    listTitle: 'Clubes com coordenada (lista)',
    noPoints: 'Nenhum clube com coordenada para este país.',
    noLocationAria: 'Clubes sem localização',
    noLocationTitle: 'Sem localização',
    noLocationGap:
      '{n} clube(s) sem coordenada no acervo para este país — não são plotados (vazio-honesto).',
    noLocationNone: 'Nenhum clube sem coordenada para este país.',
  },
  'en-us': {
    intro: [
      { text: 'Clubs with an auditable coordinate, by country. The ' },
      { text: 'list', strong: true },
      { text: ' is the main path; the map is an accessory. Clubs without a coordinate are ' },
      { text: 'not', strong: true },
      {
        text: ' plotted — they appear in the “without location” counter (honest-empty). Attribution per source right below the map.',
      },
    ],
    countryLabel: 'Country',
    womenToggle: 'Show women’s clubs',
    withCoordinates: '{n} with coordinates · {m} without location',
    hint: 'Click a country on the map to select it and zoom in · click a point to open the club · +/− buttons or double-click to zoom.',
    loadError: 'The points could not be loaded right now.',
    sourcesAria: 'Source attribution',
    sourcesTitle: 'Sources for this map',
    tiles: '© OpenStreetMap contributors — ODbL (basemap tiles)',
    vector: 'Vector base: Natural Earth (public domain)',
    wikidata: 'Wikidata — CC0 (identity/attributes)',
    listAria: 'Clubs with coordinates',
    listTitle: 'Clubs with coordinates (list)',
    noPoints: 'No club with a coordinate for this country.',
    noLocationAria: 'Clubs without location',
    noLocationTitle: 'Without location',
    noLocationGap:
      '{n} club(s) without a coordinate in the archive for this country — they are not plotted (honest-empty).',
    noLocationNone: 'No club without a coordinate for this country.',
  },
  'es-es': {
    intro: [
      { text: 'Clubes con coordenada auditable, por país. La ' },
      { text: 'lista', strong: true },
      { text: ' es el camino principal; el mapa es accesorio. Los clubes sin coordenada ' },
      { text: 'no', strong: true },
      {
        text: ' se plotean — aparecen en el contador de “sin ubicación” (vacío-honesto). Atribución por fuente justo debajo del mapa.',
      },
    ],
    countryLabel: 'País',
    womenToggle: 'Mostrar clubes femeninos',
    withCoordinates: '{n} con coordenada · {m} sin ubicación',
    hint: 'Haz clic en un país del mapa para seleccionarlo y acercar · haz clic en un punto para ver el club · botones +/− o doble clic para hacer zoom.',
    loadError: 'No se pudieron cargar los puntos ahora.',
    sourcesAria: 'Atribución de las fuentes',
    sourcesTitle: 'Fuentes de este mapa',
    tiles: '© OpenStreetMap contributors — ODbL (teselas de la base cartográfica)',
    vector: 'Base vectorial: Natural Earth (dominio público)',
    wikidata: 'Wikidata — CC0 (identidad/atributos)',
    listAria: 'Clubes con coordenada',
    listTitle: 'Clubes con coordenada (lista)',
    noPoints: 'Ningún club con coordenada para este país.',
    noLocationAria: 'Clubes sin ubicación',
    noLocationTitle: 'Sin ubicación',
    noLocationGap:
      '{n} club(es) sin coordenada en el acervo para este país — no se plotean (vacío-honesto).',
    noLocationNone: 'Ningún club sin coordenada para este país.',
  },
};

/** Interpola `{chave}` sem depender do provider (o mapa também roda em teste isolado). */
export function mapText(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (todo, chave: string) =>
    chave in params ? String(params[chave]) : todo,
  );
}
