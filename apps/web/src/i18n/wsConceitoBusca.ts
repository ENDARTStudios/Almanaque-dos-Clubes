import type { Locale } from './config';

/**
 * Copy adicional de /search no conceito FICHA. O texto de máquina (placeholder, carregando,
 * erro, vazio, total, limitações) continua em wsC2.ts — este módulo só acrescenta o cabeçalho,
 * a dica, os rótulos de grupo e a nota de escopo que o quadro pede.
 */
export interface ConceitoBuscaStrings {
  kicker: string;
  title: string;
  subtitle: string;
  clear: string;
  filterLabel: string;
  gender: string;
  women: string;
  allTypes: string;
  groups: { club: string; player: string; competition: string };
  typeSingular: { club: string; player: string; competition: string };
  note: string;
}

export const wsConceitoBusca: Record<Locale, ConceitoBuscaStrings> = {
  'pt-br': {
    kicker: 'Busca · 3 tipos de resultado',
    title: 'Buscar no Almanaque',
    subtitle: 'Clube, jogador ou competição. Sem acento e sem caixa.',
    clear: 'limpar busca',
    filterLabel: 'Filtrar por tipo',
    gender: 'Gênero',
    women: 'Feminino',
    allTypes: 'Todos',
    groups: { club: 'Clubes', player: 'Jogadores', competition: 'Competições' },
    typeSingular: { club: 'clube', player: 'jogador', competition: 'competição' },
    note: 'A busca cobre 3 tipos de resultado. Resultado sem correspondência não é inventado — o grupo não aparece.',
  },
  'en-us': {
    kicker: 'Search · 3 result types',
    title: 'Search the Almanaque',
    subtitle: 'Club, player or competition. Accent- and case-insensitive.',
    clear: 'clear search',
    filterLabel: 'Filter by type',
    gender: 'Gender',
    women: "Women's",
    allTypes: 'All',
    groups: { club: 'Clubs', player: 'Players', competition: 'Competitions' },
    typeSingular: { club: 'club', player: 'player', competition: 'competition' },
    note: 'Search covers 3 result types. A result without a match is not invented — the group does not appear.',
  },
  'es-es': {
    kicker: 'Búsqueda · 3 tipos de resultado',
    title: 'Buscar en el Almanaque',
    subtitle: 'Club, jugador o competición. Sin acentos y sin distinguir mayúsculas.',
    clear: 'limpiar búsqueda',
    filterLabel: 'Filtrar por tipo',
    gender: 'Género',
    women: 'Femenino',
    allTypes: 'Todos',
    groups: { club: 'Clubes', player: 'Jugadores', competition: 'Competiciones' },
    typeSingular: { club: 'club', player: 'jugador', competition: 'competición' },
    note: 'La búsqueda cubre 3 tipos de resultado. Un resultado sin coincidencia no se inventa — el grupo no aparece.',
  },
};
