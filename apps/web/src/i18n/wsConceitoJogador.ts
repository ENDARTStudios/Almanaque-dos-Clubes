import type { Locale } from './config';

/**
 * /players/[id] no conceito FICHA — strings da composição (módulo ADITIVO).
 *
 * Não toca `Dictionary`, `i18n/types.ts` nem os dicionários: a página continua lendo do
 * dicionário os rótulos que JÁ existiam (Carreira, Conquistas, Prêmios individuais, Clubes,
 * Jogos, Gols, posição, nascimento, altura, pé preferido, apelido). Aqui ficam só as strings
 * da composição nova — kicker, moldura do retrato, média, passagens, procedência.
 *
 * Honestidade: nenhuma string promete dado que a API não publica. "—" é lacuna declarada.
 */
export interface ConceitoJogadorStrings {
  /** Kicker da ficha: "Jogador · posição · país". */
  kicker: string;
  backToPlayers: string;
  head: {
    /** `{name}` = nome completo do jogador. */
    photoAlt: string;
    /** Rótulo da contagem de fãs no botão de favoritar. */
    fans: string;
    /** Prefixo lido só pelo leitor de tela antes da licença do retrato. */
    photoSourcePrefix: string;
    photoLicenseUnknown: string;
  };
  pillars: {
    /** "Média" — gols por jogo. O dicionário não tinha a chave. */
    average: string;
    appsNote: string;
    goalsNote: string;
    averageNote: string;
    titlesNote: string;
  };
  career: {
    caption: string;
    /** Coluna que o dicionário não tinha. Jogos/Gols vêm do dicionário. */
    period: string;
    average: string;
    note: string;
  };
  stints: {
    caption: string;
    /** `{count}` = passagens com gols registrados. */
    aside: string;
    stint: string;
    seasons: string;
    goalsPerGame: string;
    note: string;
  };
  achievements: {
    caption: string;
    /** `{titles}` = conquistas registradas. */
    aside: string;
    competition: string;
    titles: string;
    years: string;
  };
  awards: {
    caption: string;
    /** `{count}` = prêmios individuais registrados. */
    aside: string;
    award: string;
    times: string;
    years: string;
  };
  clubs: { caption: string };
  details: {
    heading: string;
    country: string;
    qid: string;
    importedFrom: string;
    source: string;
    sourceLink: string;
  };
  provenance: {
    heading: string;
    lead: string;
    source: string;
    career: string;
    /** `{count}` = conquistas registradas. */
    titles: string;
    /** `{count}` = prêmios individuais registrados. */
    awards: string;
    /** `{license}` = licença declarada do retrato. */
    photo: string;
    photoUnknown: string;
    photoIllustration: string;
    importedFrom: string;
    gap: string;
    metrics: string;
  };
}

/** Substitui `{chave}` no texto — usado só na apresentação. */
export function fillJogador(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export const conceitoJogadorStrings: Record<Locale, ConceitoJogadorStrings> = {
  'pt-br': {
    kicker: 'Jogador',
    backToPlayers: 'Voltar para Jogadores',
    head: {
      photoAlt: 'Retrato de {name}',
      fans: 'fãs',
      photoSourcePrefix: 'Fonte do retrato: ',
      photoLicenseUnknown: 'Licença do retrato não catalogada',
    },
    pillars: {
      average: 'Média',
      appsNote: 'no acervo',
      goalsNote: 'marcados',
      averageNote: 'gols por jogo',
      titlesNote: 'conquistas registradas',
    },
    career: {
      caption: 'Passagens do jogador por clube, com período, jogos, gols e média',
      period: 'Período',
      average: 'Média',
      note: 'Somatório das passagens catalogadas por clube. Jogos, gols e média só aparecem quando a fonte publica os números; "—" é lacuna declarada, nunca zero.',
    },
    stints: {
      caption: 'Gols e jogos do jogador em cada passagem',
      aside: '{count} passagens',
      stint: 'Passagem',
      seasons: 'Temporadas',
      goalsPerGame: 'Gols/jogo',
      note: 'Cada linha é uma passagem com gols registrados. Gols/jogo = gols ÷ jogos; sem jogos publicados, fica "—".',
    },
    achievements: {
      caption: 'Conquistas do jogador por competição, com os anos registrados',
      aside: '{titles} títulos',
      competition: 'Competição',
      titles: 'Títulos',
      years: 'Anos',
    },
    awards: {
      caption: 'Prêmios individuais do jogador, com as vezes e os anos registrados',
      aside: '{count} prêmios',
      award: 'Prêmio',
      times: 'Vezes',
      years: 'Anos',
    },
    clubs: { caption: 'Clubes por onde o jogador passou no acervo' },
    details: {
      heading: 'Ficha técnica',
      country: 'País',
      qid: 'Wikidata',
      importedFrom: 'Origem',
      source: 'Fonte',
      sourceLink: 'Ver no Wikidata',
    },
    provenance: {
      heading: 'Procedência',
      lead: 'Dados do acervo com proveniência por item — número sem fonte não entra.',
      source: 'Fonte',
      career: 'Carreira e conquistas derivadas do grafo (arestas PLAYED_FOR e WON).',
      titles: 'Conquistas conferidas: {count} registros com fonte.',
      awards: 'Prêmios individuais com proveniência por item: {count}.',
      photo: 'Retrato com licença declarada: {license}.',
      photoUnknown: 'Retrato sem licença catalogada — a origem não publicou o uso.',
      photoIllustration:
        'Sem retrato oficial no acervo: a moldura mostra ilustração autoral da posição.',
      importedFrom: 'Importado de',
      gap: 'Quando a origem não responde, o dado aparece como —: lacuna declarada, nunca zero.',
      metrics:
        'Jogos e gols somam apenas as passagens com número publicado; a média usa os dois totais.',
    },
  },
  'en-us': {
    kicker: 'Player',
    backToPlayers: 'Back to players',
    head: {
      photoAlt: 'Portrait of {name}',
      fans: 'supporters',
      photoSourcePrefix: 'Portrait source: ',
      photoLicenseUnknown: 'Portrait license not cataloged',
    },
    pillars: {
      average: 'Average',
      appsNote: 'in the archive',
      goalsNote: 'scored',
      averageNote: 'goals per match',
      titlesNote: 'recorded titles',
    },
    career: {
      caption: 'Player stints by club, with period, appearances, goals and average',
      period: 'Period',
      average: 'Average',
      note: 'Sum of catalogued stints per club. Appearances, goals and average appear only when the source publishes the numbers; "—" is a declared gap, never zero.',
    },
    stints: {
      caption: 'Player goals and appearances in each stint',
      aside: '{count} stints',
      stint: 'Stint',
      seasons: 'Seasons',
      goalsPerGame: 'Goals/match',
      note: 'Each row is a stint with goals on record. Goals/match = goals ÷ appearances; without published appearances it stays "—".',
    },
    achievements: {
      caption: 'Player titles by competition, with the years on record',
      aside: '{titles} titles',
      competition: 'Competition',
      titles: 'Titles',
      years: 'Years',
    },
    awards: {
      caption: 'Individual awards, with how many times and the years on record',
      aside: '{count} awards',
      award: 'Award',
      times: 'Times',
      years: 'Years',
    },
    clubs: { caption: 'Clubs the player has played for in the archive' },
    details: {
      heading: 'Fact sheet',
      country: 'Country',
      qid: 'Wikidata',
      importedFrom: 'Imported from',
      source: 'Source',
      sourceLink: 'View on Wikidata',
    },
    provenance: {
      heading: 'Provenance',
      lead: 'Archive data with item-level provenance — no number without a source.',
      source: 'Source',
      career: 'Career and titles derived from the graph (PLAYED_FOR and WON edges).',
      titles: 'Titles checked: {count} records with a source.',
      awards: 'Individual awards with item-level provenance: {count}.',
      photo: 'Portrait with declared license: {license}.',
      photoUnknown: 'Portrait without a cataloged license — the source did not publish the usage.',
      photoIllustration:
        'No official portrait in the archive: the frame shows an original illustration of the position.',
      importedFrom: 'Imported from',
      gap: 'When the source does not answer, the data appears as —: a declared gap, never zero.',
      metrics:
        'Appearances and goals sum only the stints with published numbers; the average uses both totals.',
    },
  },
  'es-es': {
    kicker: 'Jugador',
    backToPlayers: 'Volver a jugadores',
    head: {
      photoAlt: 'Retrato de {name}',
      fans: 'aficionados',
      photoSourcePrefix: 'Fuente del retrato: ',
      photoLicenseUnknown: 'Licencia del retrato no catalogada',
    },
    pillars: {
      average: 'Promedio',
      appsNote: 'en el acervo',
      goalsNote: 'marcados',
      averageNote: 'goles por partido',
      titlesNote: 'títulos registrados',
    },
    career: {
      caption: 'Pasos del jugador por club, con período, partidos, goles y promedio',
      period: 'Período',
      average: 'Promedio',
      note: 'Suma de los pasos catalogados por club. Partidos, goles y promedio solo aparecen cuando la fuente publica los números; «—» es una laguna declarada, nunca cero.',
    },
    stints: {
      caption: 'Goles y partidos del jugador en cada paso',
      aside: '{count} pasos',
      stint: 'Paso',
      seasons: 'Temporadas',
      goalsPerGame: 'Goles/partido',
      note: 'Cada fila es un paso con goles registrados. Goles/partido = goles ÷ partidos; sin partidos publicados queda «—».',
    },
    achievements: {
      caption: 'Títulos del jugador por competición, con los años registrados',
      aside: '{titles} títulos',
      competition: 'Competición',
      titles: 'Títulos',
      years: 'Años',
    },
    awards: {
      caption: 'Premios individuales, con las veces y los años registrados',
      aside: '{count} premios',
      award: 'Premio',
      times: 'Veces',
      years: 'Años',
    },
    clubs: { caption: 'Clubes por los que pasó el jugador en el acervo' },
    details: {
      heading: 'Ficha técnica',
      country: 'País',
      qid: 'Wikidata',
      importedFrom: 'Origen',
      source: 'Fuente',
      sourceLink: 'Ver en Wikidata',
    },
    provenance: {
      heading: 'Procedencia',
      lead: 'Datos del acervo con procedencia por ítem — ningún número sin fuente.',
      source: 'Fuente',
      career: 'Carrera y títulos derivados del grafo (aristas PLAYED_FOR y WON).',
      titles: 'Títulos verificados: {count} registros con fuente.',
      awards: 'Premios individuales con procedencia por ítem: {count}.',
      photo: 'Retrato con licencia declarada: {license}.',
      photoUnknown: 'Retrato sin licencia catalogada — la fuente no publicó el uso.',
      photoIllustration:
        'Sin retrato oficial en el acervo: el marco muestra una ilustración autoral de la posición.',
      importedFrom: 'Importado de',
      gap: 'Cuando la fuente no responde, el dato aparece como —: laguna declarada, nunca cero.',
      metrics:
        'Partidos y goles suman solo los pasos con número publicado; el promedio usa ambos totales.',
    },
  },
};
