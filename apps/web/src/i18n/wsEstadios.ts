import type { Locale } from './config';

/**
 * ESTÁDIOS — strings da rota `/estadios`.
 *
 * Módulo ADITIVO, como `wsT541`/`wsFicha`: não toca o dicionário global nem o arquivo de tipos
 * compartilhado. Se a rota for movida ou removida, este arquivo sai junto e nada mais sabe dela.
 */
export interface EstadiosStrings {
  title: string;
  subtitle: string;
  /** Colunas da tabela. */
  colName: string;
  colCity: string;
  colCountry: string;
  colCapacity: string;
  colClub: string;
  /** Detalhe. */
  capacity: string;
  surface: string;
  coordinates: string;
  homeClub: string;
  noClub: string;
  backToList: string;
  searchPlaceholder: string;
  /** Proveniência: de onde o dado veio. */
  provenance: string;
  notFound: string;
}

export const estadiosStrings: Record<Locale, EstadiosStrings> = {
  'pt-br': {
    title: 'Estádios',
    subtitle:
      'Os estádios do acervo, ordenados por capacidade. Onde o clube joga é parte da ficha dele — e o nome do estádio muda a história de um clube.',
    colName: 'Estádio',
    colCity: 'Cidade',
    colCountry: 'País',
    colCapacity: 'Capacidade',
    colClub: 'Clube mandante',
    capacity: 'Capacidade',
    surface: 'Piso',
    coordinates: 'Coordenadas',
    homeClub: 'Clube mandante',
    noClub: 'Sem clube vinculado',
    backToList: 'Todos os estádios',
    searchPlaceholder: 'Buscar estádio',
    provenance:
      'Fonte: cadastro de estádios do acervo. Capacidade e piso vêm de Wikidata quando há QID; sem QID, o campo fica vazio em vez de estimado.',
    notFound: 'Estádio não encontrado',
  },
  'en-us': {
    title: 'Stadiums',
    subtitle:
      'The archive’s stadiums, ordered by capacity. Where a club plays is part of its record — and a stadium’s name changes a club’s story.',
    colName: 'Stadium',
    colCity: 'City',
    colCountry: 'Country',
    colCapacity: 'Capacity',
    colClub: 'Home club',
    capacity: 'Capacity',
    surface: 'Surface',
    coordinates: 'Coordinates',
    homeClub: 'Home club',
    noClub: 'No club linked',
    backToList: 'All stadiums',
    searchPlaceholder: 'Search stadium',
    provenance:
      'Source: the archive’s stadium register. Capacity and surface come from Wikidata when a QID exists; without one the field stays empty rather than estimated.',
    notFound: 'Stadium not found',
  },
  'es-es': {
    title: 'Estadios',
    subtitle:
      'Los estadios del archivo, ordenados por capacidad. Dónde juega un club es parte de su ficha — y el nombre del estadio cambia la historia de un club.',
    colName: 'Estadio',
    colCity: 'Ciudad',
    colCountry: 'País',
    colCapacity: 'Capacidad',
    colClub: 'Club local',
    capacity: 'Capacidad',
    surface: 'Superficie',
    coordinates: 'Coordenadas',
    homeClub: 'Club local',
    noClub: 'Sin club vinculado',
    backToList: 'Todos los estadios',
    searchPlaceholder: 'Buscar estadio',
    provenance:
      'Fuente: registro de estadios del archivo. La capacidad y la superficie vienen de Wikidata cuando hay QID; sin él, el campo queda vacío en vez de estimado.',
    notFound: 'Estadio no encontrado',
  },
};
