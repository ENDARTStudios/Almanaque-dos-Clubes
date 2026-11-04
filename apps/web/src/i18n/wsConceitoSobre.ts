import type { Locale } from './config';

/**
 * Copy da página /sobre no conceito FICHA ("Um acervo, não um agregador").
 * A página antiga era um documento institucional/legal; o quadro pede a apresentação do projeto
 * com números reais do acervo e as promessas que separam este site de um agregador.
 */
export interface ConceitoSobreStrings {
  kicker: string;
  title: string;
  intro: string;
  totals: { clubs: string; players: string; competitions: string; matches: string };
  blocks: Array<{ title: string; body: string }>;
  whoTitle: string;
  whoIntro: string;
  whoCards: Array<{ title: string; body: string }>;
  fundingTitle: string;
  fundingIntro: string;
  funding: Array<{ title: string; body: string }>;
  promises: Array<{ title: string; body: string }>;
  sheetTitle: string;
  sheet: {
    name: string;
    nameValue: string;
    origin: string;
    originValue: string;
    license: string;
    licenseValue: string;
    contact: string;
    contactValue: string;
  };
  operation: string;
  note: string;
}

export const wsConceitoSobre: Record<Locale, ConceitoSobreStrings> = {
  'pt-br': {
    kicker: 'Institucional · sobre o projeto',
    title: 'Um acervo, não um agregador',
    intro:
      'O Almanaque dos Clubes existe para responder uma pergunta simples com um número verificável: quantas vezes, desde quando, e contra quem.',
    totals: {
      clubs: 'Clubes',
      players: 'Jogadores',
      competitions: 'Competições',
      matches: 'Partidas',
    },
    blocks: [
      {
        title: 'O problema',
        body: 'A história do futebol está espalhada em arquivos que se contradizem. Quem procura quantos títulos um clube tem encontra três números diferentes e nenhuma explicação.',
      },
      {
        title: 'O que fazemos',
        body: 'Catalogamos e declaramos a fonte de cada número. Quando duas fontes divergem, publicamos as duas. Quando não há fonte, a lacuna é escrita — não preenchida.',
      },
      {
        title: 'O que não fazemos',
        body: 'Não estimamos, não interpolamos e não completamos. Não vendemos destaque. Não publicamos conteúdo sem procedência, nem escudo sem licença.',
      },
    ],
    whoTitle: 'Quem faz',
    whoIntro:
      'O projeto é mantido por uma equipe pequena e por quem envia correção. Toda alteração de dado fica registrada em auditoria, com autor e motivo.',
    whoCards: [
      { title: 'Curadoria de dados', body: 'verifica fonte, normaliza e publica' },
      { title: 'Engenharia', body: 'mantém a ingestão, a API e o site' },
      { title: 'Comunidade', body: 'aponta erro e envia correção, com fonte' },
    ],
    fundingTitle: 'Como o projeto se sustenta',
    fundingIntro:
      'Por assinatura de apoiadores. O acervo é aberto a todos: quem paga recebe recursos de pesquisa, não acesso privilegiado ao dado.',
    funding: [
      { title: 'Aberto', body: 'consulta completa, sem conta' },
      { title: 'Apoiador', body: 'exportação e alertas' },
      { title: 'Institucional', body: 'API e uso em pesquisa' },
    ],
    promises: [
      { title: 'Toda fonte é declarada', body: 'CC0, RSSSF, football-data, Wikidata, Commons' },
      { title: 'Ausência não vira zero', body: 'lacuna é dita, nunca preenchida' },
      { title: 'Partida sem placar não conta', body: 'não soma ponto nem gol' },
      { title: 'Escudo só com licença', body: 'verificada item por item' },
    ],
    sheetTitle: 'Ficha do projeto',
    sheet: {
      name: 'Nome',
      nameValue: 'Almanaque dos Clubes',
      origin: 'Origem do dado',
      originValue: 'aberto, com fonte por item',
      license: 'Licença do código',
      licenseValue: 'ver /termos',
      contact: 'Contato',
      contactValue: 'ver /sobre#contato',
    },
    operation:
      'Operação e identificação: END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil.',
    note: 'Esta página não vende: descreve o que o acervo faz e o que se recusa a fazer.',
  },
  'en-us': {
    kicker: 'Institutional · about the project',
    title: 'An archive, not an aggregator',
    intro:
      'Almanaque dos Clubes exists to answer one simple question with a verifiable number: how many times, since when, and against whom.',
    totals: {
      clubs: 'Clubs',
      players: 'Players',
      competitions: 'Competitions',
      matches: 'Matches',
    },
    blocks: [
      {
        title: 'The problem',
        body: 'Football history is scattered across archives that contradict each other. Anyone looking up how many titles a club has finds three different numbers and no explanation.',
      },
      {
        title: 'What we do',
        body: 'We catalogue and declare the source of every number. When two sources disagree, we publish both. When there is no source, the gap is written — not filled.',
      },
      {
        title: 'What we do not do',
        body: 'We do not estimate, interpolate or complete. We do not sell prominence. We do not publish content without provenance, nor a crest without a licence.',
      },
    ],
    whoTitle: 'Who makes it',
    whoIntro:
      'The project is maintained by a small team and by everyone who sends a correction. Every data change is logged in an audit trail with author and reason.',
    whoCards: [
      { title: 'Data curation', body: 'checks the source, normalises and publishes' },
      { title: 'Engineering', body: 'maintains ingestion, the API and the site' },
      { title: 'Community', body: 'reports errors and sends corrections, with a source' },
    ],
    fundingTitle: 'How the project is funded',
    fundingIntro:
      'Through supporter subscriptions. The archive is open to everyone: paying users get research tools, not privileged access to the data.',
    funding: [
      { title: 'Open', body: 'full lookup, no account' },
      { title: 'Supporter', body: 'export and alerts' },
      { title: 'Institutional', body: 'API and research use' },
    ],
    promises: [
      { title: 'Every source is declared', body: 'CC0, RSSSF, football-data, Wikidata, Commons' },
      { title: 'Absence never becomes zero', body: 'a gap is stated, never filled' },
      { title: 'A match without a score does not count', body: 'adds no point and no goal' },
      { title: 'Crest only with a licence', body: 'verified item by item' },
    ],
    sheetTitle: 'Project sheet',
    sheet: {
      name: 'Name',
      nameValue: 'Almanaque dos Clubes',
      origin: 'Data origin',
      originValue: 'open, with a source per item',
      license: 'Code licence',
      licenseValue: 'see /terms',
      contact: 'Contact',
      contactValue: 'see /sobre#contact',
    },
    operation:
      'Operation and identification: END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brazil.',
    note: 'This page does not sell: it describes what the archive does and what it refuses to do.',
  },
  'es-es': {
    kicker: 'Institucional · sobre el proyecto',
    title: 'Un acervo, no un agregador',
    intro:
      'Almanaque dos Clubes existe para responder una pregunta simple con un número verificable: cuántas veces, desde cuándo y contra quién.',
    totals: {
      clubs: 'Clubes',
      players: 'Jugadores',
      competitions: 'Competiciones',
      matches: 'Partidos',
    },
    blocks: [
      {
        title: 'El problema',
        body: 'La historia del fútbol está repartida en archivos que se contradicen. Quien busca cuántos títulos tiene un club encuentra tres números distintos y ninguna explicación.',
      },
      {
        title: 'Lo que hacemos',
        body: 'Catalogamos y declaramos la fuente de cada número. Cuando dos fuentes divergen, publicamos las dos. Cuando no hay fuente, la laguna se escribe — no se rellena.',
      },
      {
        title: 'Lo que no hacemos',
        body: 'No estimamos, no interpolamos y no completamos. No vendemos destaque. No publicamos contenido sin procedencia, ni escudo sin licencia.',
      },
    ],
    whoTitle: 'Quién lo hace',
    whoIntro:
      'El proyecto lo mantiene un equipo pequeño y quien envía correcciones. Todo cambio de dato queda registrado en auditoría, con autor y motivo.',
    whoCards: [
      { title: 'Curaduría de datos', body: 'verifica la fuente, normaliza y publica' },
      { title: 'Ingeniería', body: 'mantiene la ingestión, la API y el sitio' },
      { title: 'Comunidad', body: 'señala errores y envía correcciones, con fuente' },
    ],
    fundingTitle: 'Cómo se sostiene el proyecto',
    fundingIntro:
      'Con suscripciones de apoyo. El acervo es abierto para todos: quien paga recibe herramientas de investigación, no acceso privilegiado al dato.',
    funding: [
      { title: 'Abierto', body: 'consulta completa, sin cuenta' },
      { title: 'Colaborador', body: 'exportación y alertas' },
      { title: 'Institucional', body: 'API y uso en investigación' },
    ],
    promises: [
      { title: 'Toda fuente se declara', body: 'CC0, RSSSF, football-data, Wikidata, Commons' },
      { title: 'La ausencia no se vuelve cero', body: 'la laguna se dice, nunca se rellena' },
      { title: 'Un partido sin marcador no cuenta', body: 'no suma punto ni gol' },
      { title: 'Escudo solo con licencia', body: 'verificada ítem por ítem' },
    ],
    sheetTitle: 'Ficha del proyecto',
    sheet: {
      name: 'Nombre',
      nameValue: 'Almanaque dos Clubes',
      origin: 'Origen del dato',
      originValue: 'abierto, con fuente por ítem',
      license: 'Licencia del código',
      licenseValue: 'ver /termos',
      contact: 'Contacto',
      contactValue: 'ver /sobre#contact',
    },
    operation:
      'Operación e identificación: END ART Studios — CNPJ 45.370.930/0001-75, Osasco, SP — Brasil.',
    note: 'Esta página no vende: describe lo que el acervo hace y lo que se niega a hacer.',
  },
};
