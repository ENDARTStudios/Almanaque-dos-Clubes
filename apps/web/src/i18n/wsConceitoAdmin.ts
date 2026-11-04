import type { Locale } from './config';

/** Copy do /admin (Operação) no conceito FICHA. Módulo aditivo. */
export interface ConceitoAdminStrings {
  kicker: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  acervoTitle: string;
  kpi: {
    clubs: string;
    players: string;
    competitions: string;
    matches: string;
    seasons: string;
    rankings: string;
  };
  qualityTitle: string;
  quality: {
    clubLogo: string;
    clubStadium: string;
    clubColors: string;
    clubEditorial: string;
    playerPhoto: string;
    playerCountry: string;
  };
  queuesTitle: string;
  queueLabels: Record<string, string>;
  queuesEmpty: string;
  queueCount: string;
  queueAction: string;
  functionsTitle: string;
  ingestionGap: string;
  restricted: string;
  error: string;
  retry: string;
}

export const wsConceitoAdmin: Record<Locale, ConceitoAdminStrings> = {
  'pt-br': {
    kicker: 'Painel',
    title: 'Operação',
    subtitle: 'Estado do acervo, saúde da ingestão, filas de trabalho e integridade do dado.',
    updatedAt: 'atualizado',
    acervoTitle: 'Acervo',
    kpi: {
      clubs: 'Clubes',
      players: 'Jogadores',
      competitions: 'Competições',
      matches: 'Partidas',
      seasons: 'Temporadas',
      rankings: 'Rankings',
    },
    qualityTitle: 'Qualidade do dado',
    quality: {
      clubLogo: 'Clube com escudo',
      clubStadium: 'Clube com estádio',
      clubColors: 'Clube com cores',
      clubEditorial: 'Clube com texto editorial',
      playerPhoto: 'Jogador com foto',
      playerCountry: 'Jogador com país',
    },
    queuesTitle: 'Filas de trabalho',
    queueLabels: {
      moderacao: 'Moderação de clubes',
      revisao: 'Revisão de dados',
      upload: 'Upload de mídia',
      ingestao: 'Ingestão RSSSF',
      reports: 'Relatos de erro',
    },
    queuesEmpty: 'Nenhuma fila com itens pendentes.',
    queueCount: 'itens',
    queueAction: 'revisar',
    functionsTitle: 'Funções de administrador',
    ingestionGap:
      'A API de métricas não publica execuções nem latência de ingestão nesta tela; as filas e o frescor do dado substituem o gráfico em vez de um número inventado.',
    restricted: 'Acesso restrito ao Operador.',
    error: 'Não foi possível carregar as métricas.',
    retry: 'Tentar de novo',
  },
  'en-us': {
    kicker: 'Panel',
    title: 'Operations',
    subtitle: 'Archive state, ingestion health, work queues and data integrity.',
    updatedAt: 'updated',
    acervoTitle: 'Archive',
    kpi: {
      clubs: 'Clubs',
      players: 'Players',
      competitions: 'Competitions',
      matches: 'Matches',
      seasons: 'Seasons',
      rankings: 'Rankings',
    },
    qualityTitle: 'Data quality',
    quality: {
      clubLogo: 'Club with crest',
      clubStadium: 'Club with stadium',
      clubColors: 'Club with colours',
      clubEditorial: 'Club with editorial text',
      playerPhoto: 'Player with photo',
      playerCountry: 'Player with country',
    },
    queuesTitle: 'Work queues',
    queueLabels: {
      moderacao: 'Club moderation',
      revisao: 'Data review',
      upload: 'Media upload',
      ingestao: 'RSSSF ingestion',
      reports: 'Error reports',
    },
    queuesEmpty: 'No queue with pending items.',
    queueCount: 'items',
    queueAction: 'review',
    functionsTitle: 'Administrator functions',
    ingestionGap:
      'The metrics API does not publish ingestion runs or latency on this screen; queues and data freshness replace the chart instead of an invented number.',
    restricted: 'Restricted to the Operator.',
    error: 'Could not load metrics.',
    retry: 'Try again',
  },
  'es-es': {
    kicker: 'Panel',
    title: 'Operación',
    subtitle: 'Estado del acervo, salud de la ingestión, colas de trabajo e integridad del dato.',
    updatedAt: 'actualizado',
    acervoTitle: 'Acervo',
    kpi: {
      clubs: 'Clubes',
      players: 'Jugadores',
      competitions: 'Competiciones',
      matches: 'Partidos',
      seasons: 'Temporadas',
      rankings: 'Rankings',
    },
    qualityTitle: 'Calidad del dato',
    quality: {
      clubLogo: 'Club con escudo',
      clubStadium: 'Club con estadio',
      clubColors: 'Club con colores',
      clubEditorial: 'Club con texto editorial',
      playerPhoto: 'Jugador con foto',
      playerCountry: 'Jugador con país',
    },
    queuesTitle: 'Colas de trabajo',
    queueLabels: {
      moderacao: 'Moderación de clubes',
      revisao: 'Revisión de datos',
      upload: 'Subida de medios',
      ingestao: 'Ingestión RSSSF',
      reports: 'Reportes de error',
    },
    queuesEmpty: 'Ninguna cola con elementos pendientes.',
    queueCount: 'elementos',
    queueAction: 'revisar',
    functionsTitle: 'Funciones de administrador',
    ingestionGap:
      'La API de métricas no publica ejecuciones ni latencia de ingestión en esta pantalla; las colas y la frescura del dato sustituyen el gráfico en vez de un número inventado.',
    restricted: 'Acceso restringido al Operador.',
    error: 'No fue posible cargar las métricas.',
    retry: 'Intentar de nuevo',
  },
};
