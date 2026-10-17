import type { Locale } from './config';

/**
 * T583 — `<title>` e `<meta name="description">` por idioma (módulo ADITIVO, como
 * `wsMapPage`/`wsListings`).
 *
 * DEFEITO MEDIDO (auditoria de i18n): as rotas principais exportavam metadado ESTÁTICO em
 * português. Em `en-us`/`es-es` a aba e o resultado de busca traziam "Clubes"/"Jogadores"/
 * "Competições" em pt, mesmo com a tela inteira no idioma escolhido. O locale vem do mesmo
 * cookie que as páginas já leem (`almanaque_locale` via `normalizeLocale`), e o metadado
 * passa a ser gerado por requisição.
 *
 * O que NÃO se traduz: nome próprio (marca "Almanaque dos Clubes") e DADO editorial (nome
 * de clube/competição nas rotas de detalhe). Aqui só entra a moldura: título de listagem e
 * descrição do acervo.
 */
export interface MetadataStrings {
  home: { title: string; description: string };
  clubs: { title: string; description: string };
  players: { title: string; description: string };
  competitions: { title: string; description: string };
  rankings: { title: string; description: string };
  map: { title: string; description: string };
  /** Legends — hall da fama (títulos auditáveis + recordes de partidas). */
  legends: { title: string; description: string };
}

export const metadataStrings: Record<Locale, MetadataStrings> = {
  'pt-br': {
    home: {
      title: 'Almanaque dos Clubes — História do Futebol Mundial',
      description:
        'Acervo histórico do futebol em construção, com proveniência documentada. Pesquise clubes, jogadores, competições e rankings com fontes verificadas.',
    },
    clubs: {
      title: 'Clubes',
      description:
        'Explore milhares de clubes de futebol do mundo inteiro. Pesquise por nome, país, cidade e status.',
    },
    players: {
      title: 'Jogadores',
      description: 'Jogadores de futebol de todos os tempos, com posição, país e proveniência.',
    },
    competitions: {
      title: 'Competições',
      description:
        'Explore competições de futebol de todo o mundo. Pesquise por nome, país e tipo de competição.',
    },
    rankings: {
      title: 'Rankings 0-100 — Almanaque dos Clubes',
      description:
        'Rankings 0-100 por temporada com base auditável em partidas e títulos: posição, pontuação normalizada e proveniência por clube.',
    },
    map: {
      title: 'Mapa-múndi',
      description:
        'Clubes de futebol por país, com coordenada auditável e atribuição por fonte (OpenStreetMap/ODbL, Wikidata CC0, Natural Earth). Clubes sem coordenada aparecem em lista (vazio-honesto).',
    },
    legends: {
      title: 'Lendas — Hall da Fama',
      description:
        'O hall da fama do acervo: clubes com mais títulos auditáveis, líderes por competição e recordes de partidas com placar — todo número com fonte.',
    },
  },
  'en-us': {
    home: {
      title: 'Almanaque dos Clubes — World Football History',
      description:
        'A historical football archive in progress, with documented provenance. Search clubs, players, competitions and rankings with verified sources.',
    },
    clubs: {
      title: 'Clubs',
      description:
        'Explore thousands of football clubs from around the world. Search by name, country, city and status.',
    },
    players: {
      title: 'Players',
      description: 'Football players from all eras, with position, country and provenance.',
    },
    competitions: {
      title: 'Competitions',
      description:
        'Explore football competitions from around the world. Search by name, country and competition type.',
    },
    rankings: {
      title: 'Rankings 0-100 — Almanaque dos Clubes',
      description:
        '0-100 rankings by season with auditable evidence from matches and titles: position, normalized score and provenance per club.',
    },
    map: {
      title: 'World map',
      description:
        'Football clubs by country, with auditable coordinates and source attribution (OpenStreetMap/ODbL, Wikidata CC0, Natural Earth). Clubs without coordinates are listed (honest gap).',
    },
    legends: {
      title: 'Legends — Hall of Fame',
      description:
        'The archive hall of fame: clubs with the most auditable titles, leaders by competition and scored-match records — every number sourced.',
    },
  },
  'es-es': {
    home: {
      title: 'Almanaque dos Clubes — Historia del Fútbol Mundial',
      description:
        'Archivo histórico del fútbol en construcción, con procedencia documentada. Busca clubes, jugadores, competiciones y rankings con fuentes verificadas.',
    },
    clubs: {
      title: 'Clubes',
      description:
        'Explora miles de clubes de fútbol de todo el mundo. Busca por nombre, país, ciudad y estado.',
    },
    players: {
      title: 'Jugadores',
      description: 'Jugadores de fútbol de todas las épocas, con posición, país y procedencia.',
    },
    competitions: {
      title: 'Competiciones',
      description:
        'Explora competiciones de fútbol de todo el mundo. Busca por nombre, país y tipo de competición.',
    },
    rankings: {
      title: 'Rankings 0-100 — Almanaque dos Clubes',
      description:
        'Rankings 0-100 por temporada con base auditable en partidos y títulos: posición, puntuación normalizada y procedencia por club.',
    },
    map: {
      title: 'Mapa mundial',
      description:
        'Clubes de fútbol por país, con coordenadas auditables y atribución por fuente (OpenStreetMap/ODbL, Wikidata CC0, Natural Earth). Los clubes sin coordenadas aparecen en una lista (vacío honesto).',
    },
    legends: {
      title: 'Leyendas — Salón de la Fama',
      description:
        'El salón de la fama del acervo: clubes con más títulos auditables, líderes por competición y récords de partidos con marcador — cada número con fuente.',
    },
  },
};
