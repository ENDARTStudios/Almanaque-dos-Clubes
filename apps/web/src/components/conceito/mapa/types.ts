/**
 * Contratos de DADO consumidos pela tela /map no conceito FICHA.
 *
 * Todos são cópias ESTRUTURAIS dos endpoints que já existem na API (nada de endpoint novo):
 *   GET /clubs/countries        → índice de países (coluna ISO2 do filtro público)
 *   GET /clubs/states?country=  → índice de estados (FK stateId, mesma coluna do filtro)
 *   GET /clubs/cities?country=&state= → índice de cidades (coluna city)
 *   GET /clubs/geo-stats        → catálogo de países do mapa (contagem por countryId)
 *   GET /geo/points?country=    → pontos do mapa (só clubes com coordenada)
 *
 * Os tipos ficam aqui, e não espalhados no JSX, para o teste unitário poder montar respostas
 * reais sem depender do servidor.
 */

/** Item de /clubs/countries. */
export interface CountryIndexEntry {
  /** ISO2 exatamente como vem em clubs.country. */
  code: string;
  /** Nome na tabela Country (pode faltar); a UI traduz pelo ICU de qualquer forma. */
  name: string | null;
  clubs: number;
}

export interface CountryIndex {
  totals: { countries: number; clubsWithCountry: number };
  countries: CountryIndexEntry[];
}

/** Item de /clubs/states. */
export interface StateIndexEntry {
  /** id de states — o valor do filtro ?state= e do índice de cidades. */
  id: string;
  name: string;
  /** Código ISO 3166-2, ex.: BR-SP. */
  code: string;
  clubs: number;
  /** Clubes do estado que também têm cidade — mede se o 3º nível tem dado. */
  withCity: number;
}

export interface StateIndex {
  country: string;
  totals: { withState: number; withoutState: number; states: number };
  states: StateIndexEntry[];
}

/** Item de /clubs/cities. */
export interface CityIndexEntry {
  /** Nome exatamente como está em clubs.city — o valor do filtro ?city=. */
  name: string;
  clubs: number;
}

export interface CityIndex {
  country: string;
  totals: { withCity: number; withoutCity: number; cities: number };
  cities: CityIndexEntry[];
}

/** Opção do seletor de país: sem índice carregado, clubs é null (nunca inventado). */
export interface CountryOption {
  code: string;
  clubs: number | null;
}

/**
 * Recorte aplicado ao CONJUNTO DE PONTOS (mapa + lista de clubes).
 *
 * Usa stateCode (FK canônica do State) e city — as MESMAS colunas que os índices contam. O
 * recorte nunca filtra por nome de estado solto: clubs.state é texto livre (às vezes "SP", às
 * vezes "São Paulo"), e casar por nome produziria contagem que não bate com o índice.
 */
export interface GeoFilters {
  stateCode: string | null;
  city: string | null;
}
