import type { Locale } from './config';

/**
 * /estadios/[id] no conceito FICHA — strings da composição (módulo ADITIVO).
 *
 * Não toca `Dictionary`, `i18n/types.ts` nem `wsEstadios.ts`: a página continua usando de
 * `wsEstadios` o rótulo do link de volta. Aqui ficam só as strings da composição nova.
 *
 * Honestidade: nenhuma string promete dado que a API não publica. O `Stadium` do acervo entrega
 * nome, cidade/estado/país, capacidade, piso, coordenadas, clube vinculado e a URL da fonte.
 * Público por partida, inauguração, partidas, gols e média NÃO existem na API — e as strings
 * abaixo dizem isso em vez de sugerir um número que não foi medido.
 */
export interface ConceitoEstadioStrings {
  /** Rótulo curto da entidade, primeiro item do kicker. */
  kicker: string;
  head: {
    /** `{value}` = capacidade já formatada no idioma. */
    capacity: string;
    /** `{value}` = piso (`grass`, `artificial`… como o acervo guarda). */
    surface: string;
    /** `{name}` = clube mandante vinculado. */
    homeClub: string;
  };
  image: {
    label: string;
    missing: string;
    caption: string;
    coordsLabel: string;
  };
  metrics: {
    label: string;
    capacity: string;
    recordAttendance: string;
    inauguration: string;
    matches: string;
    goals: string;
    average: string;
    note: string;
  };
  history: {
    heading: string;
    gap: string;
  };
  clubs: {
    heading: string;
    linked: string;
    matchesGap: string;
    empty: string;
  };
  details: {
    heading: string;
    city: string;
    state: string;
    country: string;
    surface: string;
    coordinates: string;
  };
  attendanceGap: string;
  provenance: {
    source: string;
    license: string;
    sourcePrefix: string;
    note: string;
  };
}

/** Substitui `{chave}` no texto — um só lugar para todos os templates da ficha. */
export function fillEstadio(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export const conceitoEstadioStrings: Record<Locale, ConceitoEstadioStrings> = {
  'pt-br': {
    kicker: 'Estádio',
    head: {
      capacity: 'Capacidade {value}',
      surface: 'Piso {value}',
      homeClub: 'Clube mandante {name}',
    },
    image: {
      label: 'Imagem do estádio',
      missing: 'Sem foto com licença no acervo.',
      caption:
        'A moldura declara a lacuna — o acervo não desenha arquibancada nem publica imagem sem licença verificada.',
      coordsLabel: 'Coordenadas',
    },
    metrics: {
      label: 'Números do estádio',
      capacity: 'Capacidade',
      recordAttendance: 'Maior público',
      inauguration: 'Inauguração',
      matches: 'Partidas',
      goals: 'Gols',
      average: 'Média',
      note: 'Capacidade vem do cadastro do acervo. Maior público, inauguração, partidas, gols e média por estádio não são publicados pela API — as células mostram “—” em vez de número estimado.',
    },
    history: {
      heading: 'História',
      gap: 'O acervo não publica relato histórico deste estádio. A ficha declara a lacuna em vez de preencher com texto genérico.',
    },
    clubs: {
      heading: 'Clubes que mandam aqui',
      linked: 'Clube mandante vinculado ao registro',
      matchesGap: 'Partidas e aproveitamento por estádio ainda não são publicados pelo acervo.',
      empty: 'Nenhum clube vinculado a este estádio no acervo.',
    },
    details: {
      heading: 'Ficha técnica',
      city: 'Cidade',
      state: 'Estado',
      country: 'País',
      surface: 'Piso',
      coordinates: 'Coordenadas',
    },
    attendanceGap:
      'O gráfico de público recorde por década e a tabela de maiores públicos não entram nesta ficha: o acervo não publica público por partida.',
    provenance: {
      source: 'Wikidata',
      license: 'CC0',
      sourcePrefix: 'Fonte: ',
      note: 'Capacidade, localização e piso vêm do cadastro Wikidata (CC0). O que a fonte não publica fica como lacuna declarada — nunca como estimativa.',
    },
  },
  'en-us': {
    kicker: 'Stadium',
    head: {
      capacity: 'Capacity {value}',
      surface: 'Surface {value}',
      homeClub: 'Home club {name}',
    },
    image: {
      label: 'Stadium image',
      missing: 'No licensed photo in the archive.',
      caption:
        'The frame declares the gap — the archive neither draws stands nor publishes an image without a verified licence.',
      coordsLabel: 'Coordinates',
    },
    metrics: {
      label: 'Stadium numbers',
      capacity: 'Capacity',
      recordAttendance: 'Record attendance',
      inauguration: 'Opened',
      matches: 'Matches',
      goals: 'Goals',
      average: 'Average',
      note: 'Capacity comes from the archive register. Record attendance, opening year, matches, goals and average per stadium are not published by the API — the cells show “—” instead of an estimated number.',
    },
    history: {
      heading: 'History',
      gap: 'The archive does not publish a historical account of this stadium. The record declares the gap instead of filling it with generic copy.',
    },
    clubs: {
      heading: 'Clubs that play here',
      linked: 'Home club linked to the record',
      matchesGap: 'Matches and home record per stadium are not yet published by the archive.',
      empty: 'No club linked to this stadium in the archive.',
    },
    details: {
      heading: 'Technical sheet',
      city: 'City',
      state: 'State',
      country: 'Country',
      surface: 'Surface',
      coordinates: 'Coordinates',
    },
    attendanceGap:
      'The record-attendance-by-decade chart and the biggest-attendance table are not shown: the archive does not publish attendance per match.',
    provenance: {
      source: 'Wikidata',
      license: 'CC0',
      sourcePrefix: 'Source: ',
      note: 'Capacity, location and surface come from the Wikidata register (CC0). What the source does not publish stays a declared gap — never an estimate.',
    },
  },
  'es-es': {
    kicker: 'Estadio',
    head: {
      capacity: 'Capacidad {value}',
      surface: 'Superficie {value}',
      homeClub: 'Club local {name}',
    },
    image: {
      label: 'Imagen del estadio',
      missing: 'Sin foto con licencia en el archivo.',
      caption:
        'El marco declara la laguna: el archivo no dibuja gradas ni publica imágenes sin licencia verificada.',
      coordsLabel: 'Coordenadas',
    },
    metrics: {
      label: 'Cifras del estadio',
      capacity: 'Capacidad',
      recordAttendance: 'Mayor asistencia',
      inauguration: 'Inauguración',
      matches: 'Partidos',
      goals: 'Goles',
      average: 'Media',
      note: 'La capacidad viene del registro del archivo. La mayor asistencia, la inauguración, los partidos, los goles y la media por estadio no los publica la API — las celdas muestran “—” en vez de una cifra estimada.',
    },
    history: {
      heading: 'Historia',
      gap: 'El archivo no publica un relato histórico de este estadio. La ficha declara la laguna en vez de rellenarla con texto genérico.',
    },
    clubs: {
      heading: 'Clubes que juegan aquí',
      linked: 'Club local vinculado al registro',
      matchesGap: 'Los partidos y el rendimiento por estadio aún no los publica el archivo.',
      empty: 'Ningún club vinculado a este estadio en el archivo.',
    },
    details: {
      heading: 'Ficha técnica',
      city: 'Ciudad',
      state: 'Estado',
      country: 'País',
      surface: 'Superficie',
      coordinates: 'Coordenadas',
    },
    attendanceGap:
      'El gráfico de mayor asistencia por década y la tabla de mayores asistencias no aparecen en esta ficha: el archivo no publica asistencia por partido.',
    provenance: {
      source: 'Wikidata',
      license: 'CC0',
      sourcePrefix: 'Fuente: ',
      note: 'La capacidad, la ubicación y la superficie vienen del registro de Wikidata (CC0). Lo que la fuente no publica queda como laguna declarada — nunca como estimación.',
    },
  },
};
