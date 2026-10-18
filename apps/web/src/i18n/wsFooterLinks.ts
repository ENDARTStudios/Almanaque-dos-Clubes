import type { Locale } from './config';

/**
 * T-27 — links NOVOS do rodapé (módulo ADITIVO, regra 4 do design system).
 *
 * O `Dictionary` global (`footer.*`) é arquivo quente de outras rodadas; os rótulos dos
 * links novos entram aqui, no padrão `wsC*`. O componente lê o locale do MESMO
 * `useI18n()` que já usa — nenhum texto visível fica literal (i18n obrigatório).
 *
 * Destinos REAIS, todos com rota existente no app:
 *   /map (WS-C-3) · /compare (WS comparação) · /legends (hall da fama) · /apoiadores (T-28).
 * "Apoie o projeto" NÃO promete recompensa nem cita valor — o billing real vive em /planos.
 */
export interface WsFooterLinksStrings {
  worldMap: string;
  compare: string;
  legends: string;
  support: string;
}

export const wsFooterLinksStrings: Record<Locale, WsFooterLinksStrings> = {
  'pt-br': {
    worldMap: 'Mapa-múndi',
    compare: 'Comparar',
    legends: 'Lendas e Imortais',
    support: 'Apoie o projeto',
  },
  'en-us': {
    worldMap: 'World map',
    compare: 'Compare',
    legends: 'Legends and Immortals',
    support: 'Support the project',
  },
  'es-es': {
    worldMap: 'Mapa mundial',
    compare: 'Comparar',
    legends: 'Leyendas e Inmortales',
    support: 'Apoya el proyecto',
  },
};
