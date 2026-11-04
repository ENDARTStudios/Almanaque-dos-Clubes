import type { Locale } from './config';

/**
 * /clubs/[id] no conceito FICHA — strings da composição (módulo ADITIVO).
 *
 * Não toca `Dictionary`, `i18n/types.ts` nem `wsC2.ts`: a página continua lendo de
 * `wsC2Strings.profile` os rótulos que JÁ existiam (hino, uniformes, rankings, lacunas,
 * geografia). Aqui ficam só as strings da composição nova — kicker, pilares, tabelas densas,
 * notas de lacuna e procedência.
 *
 * Honestidade: nenhuma string promete dado que a API não publica. "—" é lacuna declarada.
 */
export interface ConceitoClubeStrings {
  kicker: string;
  head: {
    /** `{year}` = ano de fundação. */
    founded: string;
    /** `{count}` = torcedores/favoritantes no acervo. */
    fans: string;
    /** Nome acessível da imagem do escudo. */
    crestAlt: string;
    crestLicense: string;
    crestUnknownLicense: string;
    crestIllustration: string;
    favoriteCount: string;
  };
  pillars: {
    titles: string;
    titlesNote: string;
    matches: string;
    matchesNote: string;
    goals: string;
    goalsNote: string;
    founded: string;
    /** `{years}` = idade do clube em anos completos. */
    foundedNote: string;
  };
  about: {
    heading: string;
    source: string;
    empty: string;
  };
  stats: {
    heading: string;
    caption: string;
    note: string;
    columns: {
      competition: string;
      played: string;
      wins: string;
      draws: string;
      losses: string;
      goalsFor: string;
      goalsAgainst: string;
      pct: string;
    };
    overallHeading: string;
    overallCaption: string;
    overall: string;
    home: string;
    away: string;
    empty: string;
    emptyBody: string;
  };
  rivals: {
    heading: string;
    caption: string;
    /** `{count}` = partidas do confronto. */
    matches: string;
    /** `{wins}` `{draws}` `{losses}` = retrospecto. */
    record: string;
    /** `{goalsFor}` `{goalsAgainst}` = gols do confronto. */
    goals: string;
  };
  honours: {
    heading: string;
    caption: string;
    /** `{titles}` `{competitions}` = totais reais do grafo. */
    aside: string;
    columns: { competition: string; titles: string; years: string };
    source: string;
    empty: string;
  };
  squad: {
    heading: string;
    caption: string;
    /** `{count}` = jogadores vinculados ao clube. */
    aside: string;
    columns: { player: string; position: string; age: string };
    statsGap: string;
    empty: string;
    positions: Record<string, string>;
  };
  kits: {
    heading: string;
    caption: string;
    /** `{season}` `{type}` = temporada e tipo do uniforme. */
    seasonType: string;
    noColors: string;
    source: string;
  };
  pennants: { heading: string; caption: string };
  anthem: { heading: string; official: string; source: string; audioSource: string };
  complement: {
    timelineHeading: string;
    timelineCaption: string;
    crestsHeading: string;
    rankingsHeading: string;
    rankingsCaption: string;
    competitionsHeading: string;
    competitionsCaption: string;
    relatedHeading: string;
    relatedCaption: string;
    graphHeading: string;
    graphCaption: string;
    detailsHeading: string;
    geographyHeading: string;
    gapsHeading: string;
    gapsIntro: string;
    empty: string;
    relations: Record<string, string>;
    position: string;
    points: string;
    season: string;
    source: string;
    coordApprox: string;
    noGeo: string;
  };
  details: {
    country: string;
    city: string;
    state: string;
    founded: string;
    status: string;
    stadium: string;
    capacity: string;
    president: string;
    coach: string;
    nicknames: string;
    mascot: string;
    local: string;
    website: string;
    social: string;
  };
  provenance: {
    heading: string;
    lead: string;
    /** `{count}` = conquistas registradas. */
    titles: string;
    /** `{license}` = licença declarada do texto editorial. */
    about: string;
    stats: string;
    /** `{license}` = licença declarada do escudo. */
    crest: string;
    kits: string;
    pennants: string;
    anthem: string;
    gap: string;
    source: string;
    importedFrom: string;
    retrievedAt: string;
  };
}

/** Substitui `{chave}` no texto — separador de milhar e concordância por idioma. */
export function fillClube(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export const conceitoClubeStrings: Record<Locale, ConceitoClubeStrings> = {
  'pt-br': {
    kicker: 'Clube',
    head: {
      founded: 'Fundado em {year}',
      fans: '{count} torcedores',
      crestAlt: 'Escudo do {name}',
      crestLicense: 'Licença do escudo',
      crestUnknownLicense: 'Licença do escudo não catalogada',
      crestIllustration: 'Ilustração autoral — o acervo não tem escudo oficial deste clube',
      favoriteCount: 'torcedores',
    },
    pillars: {
      titles: 'Títulos',
      titlesNote: 'registrados com fonte',
      matches: 'Jogos',
      matchesNote: 'no acervo, com placar',
      goals: 'Gols',
      goalsNote: 'marcados no acervo',
      founded: 'Fundação',
      foundedNote: 'há {years} anos',
    },
    about: {
      heading: 'Sobre o clube',
      source: 'Wikipédia',
      empty: 'Descrição em catalogação — o acervo ainda não tem texto editorial deste clube.',
    },
    stats: {
      heading: 'Estatística por competição',
      caption: 'Desempenho do clube por competição, somando partidas encerradas com placar',
      note: 'Somatório das temporadas catalogadas. Só entram partidas encerradas com os dois placares.',
      columns: {
        competition: 'Competição',
        played: 'J',
        wins: 'V',
        draws: 'E',
        losses: 'D',
        goalsFor: 'GP',
        goalsAgainst: 'GC',
        pct: 'Aprov.',
      },
      overallHeading: 'Mando de campo',
      overallCaption: 'Desempenho geral, em casa e fora',
      overall: 'Geral',
      home: 'Casa',
      away: 'Fora',
      empty: 'Sem partidas encerradas com placar',
      emptyBody: 'O acervo ainda não tem partidas encerradas com os dois placares deste clube.',
    },
    rivals: {
      heading: 'Maiores rivais',
      caption: 'Confrontos mais frequentes do clube no acervo',
      matches: '{count} jogos',
      record: '{wins} V · {draws} E · {losses} D',
      goals: '{goalsFor} pró · {goalsAgainst} contra',
    },
    honours: {
      heading: 'Parede de honrarias',
      caption: 'Títulos do clube por competição, com os anos e a fonte de cada conquista',
      aside: '{titles} títulos · {competitions} competições',
      columns: { competition: 'Competição', titles: 'Títulos', years: 'Anos' },
      source: 'Fonte',
      empty: 'Nenhum título com fonte no acervo.',
    },
    squad: {
      heading: 'Elenco',
      caption: 'Jogadores vinculados ao clube no acervo',
      aside: '{count} jogadores',
      columns: { player: 'Jogador', position: 'Posição', age: 'Idade' },
      statsGap:
        'Jogos e gols por jogador ainda não são publicados pelo acervo — lacuna declarada, nunca estimativa.',
      empty: 'Nenhum jogador vinculado ao clube no acervo.',
      positions: {
        GOALKEEPER: 'Goleiro',
        DEFENDER: 'Zagueiro',
        MIDFIELDER: 'Meia',
        FORWARD: 'Atacante',
      },
    },
    kits: {
      heading: 'Uniformes',
      caption: 'Uniformes catalogados com as cores declaradas na fonte',
      seasonType: '{season} · {type}',
      noColors: 'Cores não catalogadas',
      source: 'Fonte',
    },
    pennants: {
      heading: 'Flâmulas',
      caption: 'Flâmulas catalogadas com licença e origem declaradas',
    },
    anthem: {
      heading: 'Hino',
      official: 'Oficial',
      source: 'Fonte do hino',
      audioSource: 'Licença do áudio',
    },
    complement: {
      timelineHeading: 'Linha do tempo',
      timelineCaption: 'Conquistas do clube em ordem cronológica',
      crestsHeading: 'Evolução do escudo',
      rankingsHeading: 'Rankings publicados',
      rankingsCaption: 'Posições do clube em rankings publicados',
      competitionsHeading: 'Competições relacionadas',
      competitionsCaption: 'Competições ligadas ao clube por títulos ou rankings',
      relatedHeading: 'Clubes relacionados',
      relatedCaption: 'Clubes da mesma cidade, estado, competição ou rivalidade declarada',
      graphHeading: 'Conexões no grafo',
      graphCaption: 'Arestas do grafo de conhecimento que citam este clube',
      detailsHeading: 'Ficha técnica',
      geographyHeading: 'Geografia',
      gapsHeading: 'Lacunas declaradas',
      gapsIntro: 'O acervo ainda não tem estes dados — declarados como lacuna, nunca inventados:',
      empty: 'Não disponível nesta fase.',
      relations: {
        same_city: 'Mesma cidade',
        same_state: 'Mesmo estado',
        same_competition: 'Mesma competição',
        rival: 'Rivalidade declarada',
      },
      position: 'Posição',
      points: 'Pontos',
      season: 'Temporada',
      source: 'Fonte',
      coordApprox: 'aproximada (nível município)',
      noGeo: 'Sem coordenada registrada no acervo.',
    },
    details: {
      country: 'País',
      city: 'Cidade',
      state: 'Estado',
      founded: 'Fundação',
      status: 'Status',
      stadium: 'Estádio',
      capacity: 'Capacidade',
      president: 'Presidente',
      coach: 'Treinador',
      nicknames: 'Alcunhas',
      mascot: 'Mascote',
      local: 'Local',
      website: 'Site oficial',
      social: 'Redes sociais',
    },
    provenance: {
      heading: 'Procedência',
      lead: 'Dados do acervo com proveniência por item — número sem fonte não entra.',
      titles: 'Títulos conferidos contra a lista do clube: {count} conquistas registradas.',
      about: 'Texto editorial da Wikipédia ({license}).',
      stats: 'Estatística por competição soma apenas partidas encerradas com os dois placares.',
      crest: 'Escudo com licença declarada: {license}.',
      kits: 'Uniformes com cores e origem declaradas por kit.',
      pennants: 'Flâmulas com licença e origem declaradas por imagem.',
      anthem: 'Hino com composição, letra e atribuição declaradas pela fonte.',
      gap: 'Quando a origem não responde, o dado aparece como —: lacuna declarada, nunca zero.',
      source: 'Fonte',
      importedFrom: 'Importado de',
      retrievedAt: 'Obtido em',
    },
  },
  'en-us': {
    kicker: 'Club',
    head: {
      founded: 'Founded in {year}',
      fans: '{count} supporters',
      crestAlt: 'Crest of {name}',
      crestLicense: 'Crest license',
      crestUnknownLicense: 'Crest license not cataloged',
      crestIllustration: 'Original illustration — the archive has no official crest for this club',
      favoriteCount: 'supporters',
    },
    pillars: {
      titles: 'Titles',
      titlesNote: 'recorded with a source',
      matches: 'Matches',
      matchesNote: 'in the archive, with a score',
      goals: 'Goals',
      goalsNote: 'scored in the archive',
      founded: 'Founded',
      foundedNote: '{years} years ago',
    },
    about: {
      heading: 'About the club',
      source: 'Wikipedia',
      empty: 'Description being cataloged — the archive has no editorial text for this club yet.',
    },
    stats: {
      heading: 'Statistics by competition',
      caption: 'Club performance by competition, summing finished matches with a score',
      note: 'Sum of cataloged seasons. Only finished matches with both scores are counted.',
      columns: {
        competition: 'Competition',
        played: 'P',
        wins: 'W',
        draws: 'D',
        losses: 'L',
        goalsFor: 'GF',
        goalsAgainst: 'GA',
        pct: 'Win%',
      },
      overallHeading: 'Home and away',
      overallCaption: 'Overall performance, at home and away',
      overall: 'Overall',
      home: 'Home',
      away: 'Away',
      empty: 'No finished matches with a score',
      emptyBody: 'The archive does not yet have finished matches with both scores for this club.',
    },
    rivals: {
      heading: 'Biggest rivals',
      caption: 'Most frequent matchups for this club in the archive',
      matches: '{count} matches',
      record: '{wins} W · {draws} D · {losses} L',
      goals: '{goalsFor} for · {goalsAgainst} against',
    },
    honours: {
      heading: 'Honours wall',
      caption: 'Club titles by competition, with the years and the source of each title',
      aside: '{titles} titles · {competitions} competitions',
      columns: { competition: 'Competition', titles: 'Titles', years: 'Years' },
      source: 'Source',
      empty: 'No sourced titles in the archive.',
    },
    squad: {
      heading: 'Squad',
      caption: 'Players linked to the club in the archive',
      aside: '{count} players',
      columns: { player: 'Player', position: 'Position', age: 'Age' },
      statsGap:
        'Appearances and goals per player are not yet published by the archive — a declared gap, never an estimate.',
      empty: 'No player linked to this club in the archive.',
      positions: {
        GOALKEEPER: 'Goalkeeper',
        DEFENDER: 'Defender',
        MIDFIELDER: 'Midfielder',
        FORWARD: 'Forward',
      },
    },
    kits: {
      heading: 'Kits',
      caption: 'Cataloged kits with the colors declared by the source',
      seasonType: '{season} · {type}',
      noColors: 'Colors not cataloged',
      source: 'Source',
    },
    pennants: {
      heading: 'Pennants',
      caption: 'Cataloged pennants with declared license and source',
    },
    anthem: {
      heading: 'Anthem',
      official: 'Official',
      source: 'Anthem source',
      audioSource: 'Audio license',
    },
    complement: {
      timelineHeading: 'Timeline',
      timelineCaption: 'Club titles in chronological order',
      crestsHeading: 'Crest evolution',
      rankingsHeading: 'Published rankings',
      rankingsCaption: 'Club positions in published rankings',
      competitionsHeading: 'Related competitions',
      competitionsCaption: 'Competitions linked to the club by titles or rankings',
      relatedHeading: 'Related clubs',
      relatedCaption: 'Clubs from the same city, state, competition or declared rivalry',
      graphHeading: 'Knowledge graph connections',
      graphCaption: 'Knowledge graph edges that mention this club',
      detailsHeading: 'Fact sheet',
      geographyHeading: 'Geography',
      gapsHeading: 'Declared gaps',
      gapsIntro: 'The archive does not hold these data yet — declared as gaps, never invented:',
      empty: 'Not available at this stage.',
      relations: {
        same_city: 'Same city',
        same_state: 'Same state',
        same_competition: 'Same competition',
        rival: 'Declared rivalry',
      },
      position: 'Position',
      points: 'Points',
      season: 'Season',
      source: 'Source',
      coordApprox: 'approximate (municipality level)',
      noGeo: 'No coordinate recorded in the archive.',
    },
    details: {
      country: 'Country',
      city: 'City',
      state: 'State',
      founded: 'Founded',
      status: 'Status',
      stadium: 'Stadium',
      capacity: 'Capacity',
      president: 'President',
      coach: 'Head coach',
      nicknames: 'Nicknames',
      mascot: 'Mascot',
      local: 'Location',
      website: 'Official site',
      social: 'Social media',
    },
    provenance: {
      heading: 'Provenance',
      lead: 'Archive data with per-item provenance — a number without a source does not enter.',
      titles: 'Titles checked against the club list: {count} recorded titles.',
      about: 'Editorial text from Wikipedia ({license}).',
      stats: 'Statistics by competition sum only finished matches with both scores.',
      crest: 'Crest with declared license: {license}.',
      kits: 'Kits with colors and source declared per kit.',
      pennants: 'Pennants with license and source declared per image.',
      anthem: 'Anthem with composition, lyrics and attribution declared by the source.',
      gap: 'When the source does not answer, the value appears as —: a declared gap, never zero.',
      source: 'Source',
      importedFrom: 'Imported from',
      retrievedAt: 'Retrieved at',
    },
  },
  'es-es': {
    kicker: 'Club',
    head: {
      founded: 'Fundado en {year}',
      fans: '{count} aficionados',
      crestAlt: 'Escudo del {name}',
      crestLicense: 'Licencia del escudo',
      crestUnknownLicense: 'Licencia del escudo no catalogada',
      crestIllustration: 'Ilustración original — el acervo no tiene escudo oficial de este club',
      favoriteCount: 'aficionados',
    },
    pillars: {
      titles: 'Títulos',
      titlesNote: 'registrados con fuente',
      matches: 'Partidos',
      matchesNote: 'en el acervo, con marcador',
      goals: 'Goles',
      goalsNote: 'marcados en el acervo',
      founded: 'Fundación',
      foundedNote: 'hace {years} años',
    },
    about: {
      heading: 'Sobre el club',
      source: 'Wikipedia',
      empty: 'Descripción en catalogación — el acervo aún no tiene texto editorial de este club.',
    },
    stats: {
      heading: 'Estadística por competición',
      caption: 'Rendimiento del club por competición, sumando partidos finalizados con marcador',
      note: 'Suma de las temporadas catalogadas. Solo entran partidos finalizados con los dos marcadores.',
      columns: {
        competition: 'Competición',
        played: 'PJ',
        wins: 'PG',
        draws: 'PE',
        losses: 'PP',
        goalsFor: 'GF',
        goalsAgainst: 'GC',
        pct: 'Aprov.',
      },
      overallHeading: 'Local y visitante',
      overallCaption: 'Rendimiento general, en casa y fuera',
      overall: 'General',
      home: 'Casa',
      away: 'Fuera',
      empty: 'Sin partidos finalizados con marcador',
      emptyBody: 'El acervo aún no tiene partidos finalizados con los dos marcadores de este club.',
    },
    rivals: {
      heading: 'Máximos rivales',
      caption: 'Enfrentamientos más frecuentes del club en el acervo',
      matches: '{count} partidos',
      record: '{wins} V · {draws} E · {losses} D',
      goals: '{goalsFor} a favor · {goalsAgainst} en contra',
    },
    honours: {
      heading: 'Pared de honores',
      caption: 'Títulos del club por competición, con los años y la fuente de cada conquista',
      aside: '{titles} títulos · {competitions} competiciones',
      columns: { competition: 'Competición', titles: 'Títulos', years: 'Años' },
      source: 'Fuente',
      empty: 'Ningún título con fuente en el acervo.',
    },
    squad: {
      heading: 'Plantilla',
      caption: 'Jugadores vinculados al club en el acervo',
      aside: '{count} jugadores',
      columns: { player: 'Jugador', position: 'Posición', age: 'Edad' },
      statsGap:
        'Los partidos y goles por jugador aún no los publica el acervo — laguna declarada, nunca estimación.',
      empty: 'Ningún jugador vinculado al club en el acervo.',
      positions: {
        GOALKEEPER: 'Portero',
        DEFENDER: 'Defensa',
        MIDFIELDER: 'Centrocampista',
        FORWARD: 'Delantero',
      },
    },
    kits: {
      heading: 'Uniformes',
      caption: 'Uniformes catalogados con los colores declarados por la fuente',
      seasonType: '{season} · {type}',
      noColors: 'Colores no catalogados',
      source: 'Fuente',
    },
    pennants: {
      heading: 'Banderines',
      caption: 'Banderines catalogados con licencia y origen declarados',
    },
    anthem: {
      heading: 'Himno',
      official: 'Oficial',
      source: 'Fuente del himno',
      audioSource: 'Licencia del audio',
    },
    complement: {
      timelineHeading: 'Línea de tiempo',
      timelineCaption: 'Conquistas del club en orden cronológico',
      crestsHeading: 'Evolución del escudo',
      rankingsHeading: 'Rankings publicados',
      rankingsCaption: 'Posiciones del club en rankings publicados',
      competitionsHeading: 'Competiciones relacionadas',
      competitionsCaption: 'Competiciones ligadas al club por títulos o rankings',
      relatedHeading: 'Clubes relacionados',
      relatedCaption: 'Clubes de la misma ciudad, estado, competición o rivalidad declarada',
      graphHeading: 'Conexiones del grafo',
      graphCaption: 'Aristas del grafo de conocimiento que mencionan este club',
      detailsHeading: 'Ficha técnica',
      geographyHeading: 'Geografía',
      gapsHeading: 'Lagunas declaradas',
      gapsIntro: 'El acervo aún no tiene estos datos — declarados como laguna, nunca inventados:',
      empty: 'No disponible en esta fase.',
      relations: {
        same_city: 'Misma ciudad',
        same_state: 'Mismo estado',
        same_competition: 'Misma competición',
        rival: 'Rivalidad declarada',
      },
      position: 'Posición',
      points: 'Puntos',
      season: 'Temporada',
      source: 'Fuente',
      coordApprox: 'aproximada (nivel municipio)',
      noGeo: 'Sin coordenada registrada en el acervo.',
    },
    details: {
      country: 'País',
      city: 'Ciudad',
      state: 'Estado',
      founded: 'Fundación',
      status: 'Estado',
      stadium: 'Estadio',
      capacity: 'Capacidad',
      president: 'Presidente',
      coach: 'Entrenador',
      nicknames: 'Apodos',
      mascot: 'Mascota',
      local: 'Localidad',
      website: 'Sitio oficial',
      social: 'Redes sociales',
    },
    provenance: {
      heading: 'Procedencia',
      lead: 'Datos del acervo con procedencia por elemento — un número sin fuente no entra.',
      titles: 'Títulos contrastados con la lista del club: {count} conquistas registradas.',
      about: 'Texto editorial de Wikipedia ({license}).',
      stats:
        'La estadística por competición suma solo partidos finalizados con los dos marcadores.',
      crest: 'Escudo con licencia declarada: {license}.',
      kits: 'Uniformes con colores y origen declarados por kit.',
      pennants: 'Banderines con licencia y origen declarados por imagen.',
      anthem: 'Himno con composición, letra y atribución declaradas por la fuente.',
      gap: 'Cuando la fuente no responde, el dato aparece como —: laguna declarada, nunca cero.',
      source: 'Fuente',
      importedFrom: 'Importado de',
      retrievedAt: 'Obtenido el',
    },
  },
};
