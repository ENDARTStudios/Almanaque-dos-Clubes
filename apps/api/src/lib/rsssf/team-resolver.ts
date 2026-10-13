/**
 * T519 — Resolução de nomes de time da RSSSF contra os clubes do acervo.
 * PURO e DETERMINÍSTICO (sem score fuzzy como chave): igualdade normalizada,
 * alias curado, contenção com fronteira de palavra e casamento por abreviação —
 * sempre exigindo UNICIDADE dentro de um pool fechado. Ambíguo = não resolve
 * (vira gap declarado), nunca um palpite.
 *
 * Por que não usar só o pool da temporada: a classificação do Brasileirão no
 * acervo (T508) ficou com 9 clubes sem match e um match ERRADO (Bragantino →
 * "Red Bull Bragantino II"), então o pool global filtrado por país/gênero é
 * necessário como segunda instância. Ver `RSSSF_TEAM_ALIASES` para os nomes que
 * a fonte imprime diferente do acervo (`Atlético/MG` → `Atlético-MG`).
 */

import { normalizeTeamName } from './map-team-to-club.js';

export interface ClubCandidate {
  id: string;
  name: string;
  country: string | null;
  state: string | null;
  gender: string;
  qid: string | null;
  popularName?: string | null;
  officialName?: string | null;
  city?: string | null;
}

export type ResolutionVia = 'exact' | 'alias' | 'containment' | 'word-abbrev' | 'pool-exact';

export interface TeamResolution {
  token: string;
  club: ClubCandidate | null;
  via: ResolutionVia | null;
  /** Nomes dos candidatos quando houve empate (>1) — vira gap declarado. */
  ambiguousWith: string[];
}

/**
 * Alvo de alias: nome exato no acervo e, quando o acervo tem HOMÔNIMOS, um
 * discriminador lido da própria linha do banco — `qid` (preferido) ou `city`.
 * Ex.: há dois "América Futebol Clube" masculinos no acervo (Q338285 = Belo
 * Horizonte/MG — conferido no Wikidata; e Q482251 = Morrinhos/GO) e a fonte
 * distingue pelo sufixo de UF (`América/MG`). Nenhum QID vem de memória: são os
 * que o PRÓPRIO acervo gravou, conferidos na fonte (D-2026-10-09).
 */
export interface AliasTarget {
  name: string;
  qid?: string;
  city?: string;
  /**
   * T529 — temporadas em que este alias NÃO vale, porque a fonte usa o MESMO token
   * para OUTRO clube naquele ano. Caso real: `Estudiantes` é o de La Plata (ARG) em
   * 2015/2017/2018/2022 e o de Mérida (VEN) em 2020 — um alias global serviria os
   * dois errado. Nas temporadas listadas o alias é ignorado e o token segue a
   * cascata (virando gap declarado se não houver candidato).
   */
  exceptSeasons?: string[];
}

/**
 * Aliases CURADOS: nome impresso pela RSSSF → clube exato do acervo.
 * Cada alvo foi verificado por consulta à produção (QID → `name`/`city`), não
 * digitado de memória. Só entram aqui os casos em que a cascata genérica não
 * chega — em especial onde o acervo usa um nome que a fonte não imprime
 * (`Atlético-MG`), ou onde a abreviação da fonte é ambígua (`Bragantino`
 * casaria também com o time B, "Red Bull Bragantino II").
 */
export const RSSSF_TEAM_ALIASES: Record<string, AliasTarget> = {
  // Brasileirão Série A
  'Atlético/MG': { name: 'Atlético-MG' },
  'Atlético Mineiro': { name: 'Atlético-MG' },
  'CA Mineiro': { name: 'Atlético-MG' },
  'Athletico/PR': { name: 'Club Athletico Paranaense' },
  'Athletico Paranaense': { name: 'Club Athletico Paranaense' },
  'América/MG': { name: 'América Futebol Clube', qid: 'Q338285' },
  'América Mineiro': { name: 'América Futebol Clube', qid: 'Q338285' },
  'Atlético/GO': { name: 'Atlético Clube Goianiense' },
  Bragantino: { name: 'Red Bull Bragantino' },
  'Sport Recife': { name: 'Sport Club do Recife' },
  Cuiabá: { name: 'Cuiabá Esporte Clube' },
  Criciúma: { name: 'Criciúma Esporte Clube' },
  Vitória: { name: 'Esporte Clube Vitória' },
  Goiás: { name: 'Goiás Esporte Clube' },
  Coritiba: { name: 'Coritiba Foot Ball Club' },
  Avaí: { name: 'Avaí Futebol Clube' },
  Ceará: { name: 'Ceará Sporting Club' },
  Juventude: { name: 'Esporte Clube Juventude' },
  // Homônimos do acervo desempatados pela escolha que o PRÓPRIO acervo fez na
  // classificação do Brasileirão (T508+): "S.C. Corinthians Paulista" (e não
  // "Corinthians Santo Andre"), "Fluminense F.C." (e não "Fluminense Esporte
  // Clube", de Teresina), "São Paulo FC" (e não "São Paulo Futebol Clube", de
  // Parnamirim). Indispensável em 2021 — temporada SEM classificação no acervo,
  // logo sem pool de temporada para desempatar (o Corinthians chegava a casar
  // com o clube de Santo André pela regra de abreviação).
  Corinthians: { name: 'S.C. Corinthians Paulista' },
  Fluminense: { name: 'Fluminense F.C.' },
  Palmeiras: { name: 'Sociedade Esportiva Palmeiras' },
  'São Paulo': { name: 'São Paulo FC' },
  Grêmio: { name: 'Grêmio FBPA' },
  Internacional: { name: 'S.C. Internacional' },
  Botafogo: { name: 'Botafogo F.R.' },
  Cruzeiro: { name: 'Cruzeiro E.C.' },
  // Libertadores
  'Ind. del Valle': { name: 'Independiente del Valle' },
  'Ind. Medellín': { name: 'Corporación Deportiva Independiente Medellín' },
  'Estudiantes de LP': { name: 'Estudiantes de La Plata' },
  'Argentinos Jrs': { name: 'Argentinos Juniors' },
  'U. de Deportes': { name: 'Club Universitario de Deportes' },
  'Junior FC': { name: 'Atlético Junior' },
  Nacional: { name: 'Club Nacional de Football' },
  'Cerro Porteños': { name: 'Cerro Porteño' },
  'SD Aucas': { name: 'Sociedad Deportiva Aucas' },
  'Barcelona SC': { name: 'Barcelona S.C.' },
  'Alianza Lima': { name: 'Club Alianza Lima' },
  // T527 — Ligue 1: a fonte imprime a SIGLA da cidade e o acervo usa o nome
  // oficial, que a cascata não alcança (`Lyon` não tem fronteira de palavra
  // dentro de "Olympique Lyonnais"; `Paris-SG` é hifenizado). Alvos conferidos
  // em produção por nome+QID (D-2026-10-09).
  Brest: { name: 'Stade Brestois 29', qid: 'Q218372' },
  Lyon: { name: 'Olympique Lyonnais', qid: 'Q704' },
  'Paris-SG': { name: 'Paris Saint-Germain FC', qid: 'Q483020' },
  Rennes: { name: 'Stade Rennais F.C.', qid: 'Q19509' },
  // Homônimo no acervo: "U.S. Acli Metz" (Q106703334) e "FC Metz" (Q221525).
  Metz: { name: 'FC Metz', qid: 'Q221525' },
  // T527 — Bundesliga: a fonte imprime o nome sem o prefixo do tipo.
  'Sankt Pauli': { name: 'FC St. Pauli', qid: 'Q6463' },
  // T527 — Libertadores: `Olimpia` é homônimo de 4 clubes no acervo (PY/HN/UY/PE);
  // na Libertadores é o paraguaio. `RB Bragantino` é a forma usada no mata-mata.
  Olimpia: { name: 'Club Olimpia', qid: 'Q604589' },
  'RB Bragantino': { name: 'Red Bull Bragantino', qid: 'Q541744' },
  // T529 — La Liga. A cascata genérica erra AQUI de um jeito perigoso: `Madrid`
  // casava com "Madrid autonomous football team" (seleção regional!), `Málaga` com
  // o extinto CD Málaga e `Sporting` com um clube de Malta. Os demais são homônimos
  // internos do acervo (time B / clube histórico) que a rodada não desempata sozinha.
  Atlético: { name: 'Atlético Madrid', qid: 'Q8701' },
  Barcelona: { name: 'Fútbol Club Barcelona', qid: 'Q7156' },
  Madrid: { name: 'Real Madrid Club de Fútbol', qid: 'Q8682' },
  Deportivo: { name: 'Deportivo de A Coruña', qid: 'Q8760' },
  Elche: { name: 'Elche Club de Fútbol', qid: 'Q10512' },
  Espanyol: { name: 'RCD Espanyol de Barcelona', qid: 'Q8780' },
  Getafe: { name: 'Getafe CF', qid: 'Q8806' },
  Granada: { name: 'Granada CF', qid: 'Q8812' },
  'Las Palmas': { name: 'Unión Deportiva Las Palmas', qid: 'Q11979' },
  Sociedad: { name: 'Real Sociedad de Fútbol', qid: 'Q10315' },
  Valencia: { name: 'Valencia Club de Fútbol', qid: 'Q10333' },
  // O acervo tem DOIS "Athletic Club" masculinos: o QID fixa o de Bilbao.
  Athletic: { name: 'Athletic Club', qid: 'Q8687' },
  // T529 — Serie A. Homônimos internos (o acervo tem entidades "…and the Italian
  // national football team" e o Milan feminino) — o QID evita o casamento errado.
  Chievo: { name: 'AC ChievoVerona', qid: 'Q2037' },
  Inter: { name: 'Inter Milan', qid: 'Q631' },
  Juventus: { name: 'Juventus FC', qid: 'Q1422' },
  Milan: { name: 'AC Milan', qid: 'Q1543' },
  Roma: { name: 'AS Roma', qid: 'Q2739' },
  Sampdoria: { name: 'U.C. Sampdoria', qid: 'Q1457' },
  // T529 — Premier League: homônimos internos (o acervo tem o time B e o clube
  // histórico com o mesmo nome de base).
  Southampton: { name: 'Southampton F.C.', qid: 'Q18732' },
  Newcastle: { name: 'Newcastle United F.C.', qid: 'Q18716' },
  Leeds: { name: 'Leeds United F.C.', qid: 'Q1128631' },
  // T529 — Brasileirão: `Atlético/PR` é o MESMO clube do `Athletico/PR` (renomeado
  // em 2019); `Sport` é o Sport do Recife (a cascata casava com Internacional!);
  // `CSA` é o Centro Sportivo Alagoano.
  'Atlético/PR': { name: 'Club Athletico Paranaense', qid: 'Q506832' },
  Sport: { name: 'Sport Club do Recife', qid: 'Q219098' },
  CSA: { name: 'Centro Sportivo Alagoano', qid: 'Q928885' },
  // T529 — Libertadores (2015-2021). Homônimos do acervo desempatados pelo QID do
  // clube que a fonte quer dizer: o River de Buenos Aires (e não o de Montevidéu),
  // o Atlético Nacional da COLÔMBIA (e não o argentino de mesmo nome), o Flamengo
  // do Rio (o acervo tem um "Sociedad Deportiva Flamengo" espanhol) etc.
  'River Plate': { name: 'Club Atlético River Plate', qid: 'Q15799' },
  Flamengo: { name: 'Clube de Regatas do Flamengo', qid: 'Q17479' },
  Santos: { name: 'Santos F.C.', qid: 'Q80955' },
  // Em 2020 o MESMO token é o Estudiantes de MÉRIDA (VEN), que o acervo não tem:
  // a exceção deixa aquele ano cair na cascata (gap) sem perder os outros.
  Estudiantes: {
    name: 'Estudiantes de La Plata',
    qid: 'Q214940',
    exceptSeasons: ['2020'],
  },
  Melgar: { name: 'FBC Melgar', qid: 'Q602542' },
  Lanús: { name: 'Club Atlético Lanús', qid: 'Q324589' },
  'Atlético Tucumán': { name: 'Club Atlético Tucumán', qid: 'Q757470' },
  'Atlético Nacional': { name: 'Corporación Deportiva Club Atlético Nacional', qid: 'Q332605' },
  'Atl. Nacional': { name: 'Corporación Deportiva Club Atlético Nacional', qid: 'Q332605' },
  'Atl. Mineiro': { name: 'Atlético-MG' },
  Guaraní: { name: 'Club Guaraní', qid: 'Q605044' },
  'San José': { name: 'CD San José', qid: 'Q127904' },
  Independiente: { name: 'Club Atlético Independiente', qid: 'Q214978' },
  'Independiente Santa Fe': { name: 'Santa Fe Corporación Deportiva', qid: 'Q1424072' },
  'Indep. Santa Fe': { name: 'Santa Fe Corporación Deportiva', qid: 'Q1424072' },
  // Renomeado em 2019: o mesmo clube.
  'Real Garcilaso': { name: 'Cusco FC', qid: 'Q602397' },
  'Pumas UNAM': { name: 'Club Universidad Nacional', qid: 'Q1143000' },
  Toluca: { name: 'Deportivo Toluca', qid: 'Q670186' },
  // A fonte às vezes imprime o clube com o país entre parênteses.
  'Grêmio (BRA)': { name: 'Grêmio FBPA' },
  'Palmeiras (São Paulo)': { name: 'Sociedade Esportiva Palmeiras' },
  'Athl. Paranaense': { name: 'Club Athletico Paranaense', qid: 'Q506832' },
  'Atl. Paranaense': { name: 'Club Athletico Paranaense', qid: 'Q506832' },
  'Atlético Paranaense': { name: 'Club Athletico Paranaense', qid: 'Q506832' },
  // T529 — 2ª rodada de cura da Libertadores: o último degrau da cascata
  // (word-abbrev) estava escolhendo o clube ERRADO — o time feminino do Peñarol
  // (com gender='men' no acervo!), o San Lorenzo do PERU, o Universitario de
  // TRUJILLO e o Vélez de San Ramón. O QID fixa o clube que a fonte quer dizer.
  Peñarol: { name: 'Club Atlético Peñarol', qid: 'Q16320' },
  'San Lorenzo': { name: 'Club Atlético San Lorenzo de Almagro', qid: 'Q218282' },
  'San Lorenzo de Almagro': { name: 'Club Atlético San Lorenzo de Almagro', qid: 'Q218282' },
  Universitario: { name: 'Club Universitario de Deportes', qid: 'Q19066' },
  'Vélez Sársfield': { name: 'Club Atlético Vélez Sársfield', qid: 'Q215163' },
  // O Atlas da Libertadores é o MEXICANO (o acervo também tem um clube argentino
  // homônimo, que é com quem a cascata casava).
  Atlas: { name: 'Atlas F.C.', qid: 'Q1023532' },
  // T538 — os 18 clubes que o T529 declarou ausentes foram INGERIDOS (seed
  // seed-absent-clubs-t538). O alias com QID resolve os tokens da fonte de forma
  // determinística — sem ele, 'Sporting' ainda acharia o clube de MALTA e 'Paraná'
  // o clube de Campo Mourão, porque ambos contêm o token.
  Sporting: { name: 'Real Sporting de Gijón', qid: 'Q12278' },
  Málaga: { name: 'Málaga Club de Fútbol', qid: 'Q8857' },
  Paraná: { name: 'Paraná Clube', qid: 'Q838534' },
  Eibar: { name: 'Sociedad Deportiva Eibar', qid: 'Q770740' },
  Huesca: { name: 'Sociedad Deportiva Huesca', qid: 'Q11971' },
  Lecce: { name: 'Unione Sportiva Lecce', qid: 'Q13391' },
  Como: { name: 'Como 1907', qid: 'Q1120838' },
  Monza: { name: 'Associazione Calcio Monza', qid: 'Q289482' },
  Cremonese: { name: 'Unione Sportiva Cremonese', qid: 'Q759482' },
  Frosinone: { name: 'Frosinone Calcio', qid: 'Q845043' },
  Salernitana: { name: 'Unione Sportiva Salernitana 1919', qid: 'Q847587' },
  // A fonte imprime 'SPAL'; o nome do clube no acervo é o do artigo pt.
  SPAL: { name: 'Ars et Labor Ferrara', qid: 'Q13385' },
  Joinville: { name: 'Joinville Esporte Clube', qid: 'Q2035444' },
  Patronato: { name: 'Club Atlético Patronato', qid: 'Q1773830' },
  // O acervo (e o rótulo pt do Wikidata) usa "...de Quito", não o título do artigo.
  'LDU Quito': { name: 'Liga Deportiva Universitaria de Quito', qid: 'Q249643' },
  'Monagas SC': { name: 'Monagas Sport Club', qid: 'Q1636856' },
  'Deportivo Táchira': { name: 'Deportivo Táchira Fútbol Club', qid: 'Q178378' },
  'Deportivo Táchira FC': { name: 'Deportivo Táchira Fútbol Club', qid: 'Q178378' },
  'Independiente Petrolero': { name: 'Club Independiente Petrolero', qid: 'Q2018250' },
  'Indep. Petrolero': { name: 'Club Independiente Petrolero', qid: 'Q2018250' },
};

/**
 * Times que a fonte imprime e o acervo NÃO tem — verificado em produção. Nunca
 * casam (o jogo vira gap declarado em vez de um match aproximado).
 *
 * T520 — `Vasco da Gama` e `Chapecoense` SAÍRAM desta lista: os dois clubes
 * existiam no acervo com `gender` errado ('women') e foram corrigidos na cura
 * (Q5014111 = clube poliesportivo do RJ com futebol; Q2536715 = clube de
 * Chapecó-SC). Continuam ausentes de verdade: Monagas, Táchira e Patronato.
 *
 * T527 — `Independiente Petrolero` (BOL, Sucre): o acervo só tem o homônimo
 * `Oriente Petrolero` (BO) e `Petroleros de Ciudad Madero` (MX) — nenhum é este.
 * Também ausente a forma abreviada usada na fase de grupos (`Indep. Petrolero`).
 * Fica de fora: `Univ. Católica`/`Universidad Católica` é AMBÍGUO de verdade (o
 * acervo tem as duas — CHI/Q427446 e EQU/Q2308911 — e as duas jogaram 2022);
 * ambiguidade é gap declarado, não chute.
 */
export const RSSSF_TEAM_ABSENT: ReadonlySet<string> = new Set<string>([
  // T538 — SAÍRAM desta lista (os clubes foram INGERIDOS do Wikidata e agora têm
  // alias determinístico abaixo): Monagas SC, Deportivo Táchira (e a variante 'FC'),
  // Patronato, Independiente Petrolero (e 'Indep. Petrolero'). Ficam aqui só os que
  // continuariam casando o clube ERRADO ou não existem em lugar nenhum.
  // T529 — La Liga: `Málaga` entra aqui de propósito. O acervo só tem o extinto
  // CD Málaga (Q124518) e o Málaga CF FEMININO — casar o Málaga CF masculino com o
  // clube histórico seria dado falso. `Sporting` idem: sem o Sporting de Gijón no
  // acervo, a cascata casava com um clube de MALTA.
  //
  // Critério da lista (lição do T529): entra aqui o que casaria o clube ERRADO.
  // Clube que apenas NÃO EXISTE no acervo fica de fora de propósito — o gap aparece
  // como "sem candidato" no relatório e, se ele entrar no acervo um dia (pool da
  // temporada), resolve sozinho em vez de ficar bloqueado por esta lista.
  // T538 — 'Sporting', 'Málaga' e 'Paraná' também SAÍRAM: os três clubes certos
  // entraram no acervo (Real Sporting de Gijón, Málaga CF, Paraná Clube) e agora
  // têm alias com QID — o que resolve melhor do que bloquear (era um gap que custava
  // ~500 partidas).
]);

function candidatesFor(c: ClubCandidate, scope: string[]): boolean {
  if (c.gender !== 'men') return false;
  if (scope.length === 0) return true;
  return c.country != null && scope.includes(c.country);
}

/**
 * Formas alternativas do token antes do match: a fonte às vezes imprime o clube
 * com prefixo/sufixo de tipo (`CR Flamengo`, `Millonarios FC`, `Barcelona SC`).
 * Tirar esses pedaços é normalização — não é adivinhação do clube.
 */
const TYPE_PREFIX = /^(cr|se|sc|sd|ca|fbc|ec|ac|cf|cd|cs|club|clube|ind|u)\s+/i;
const TYPE_SUFFIX = /\s+(fc|sc|ec|ac|cf|cd|cs|fbpa|jrs)$/i;

export function tokenVariants(tokenNorm: string): string[] {
  const out = new Set<string>([tokenNorm]);
  const noPrefix = tokenNorm.replace(TYPE_PREFIX, '');
  if (noPrefix !== tokenNorm) out.add(noPrefix);
  for (const base of [...out]) {
    const noSuffix = base.replace(TYPE_SUFFIX, '');
    if (noSuffix !== base && noSuffix.length >= 4) out.add(noSuffix);
  }
  return [...out];
}

/** Nome normalizado do candidato (também aceita popularName/officialName). */
function namesOf(c: ClubCandidate): string[] {
  return [c.name, c.popularName, c.officialName].filter((n): n is string => !!n);
}

/** O token aparece como sequência de palavras com fronteira (evita sport ⊂ sporting). */
function hasWordBoundarySubstring(tokenNorm: string, nameNorm: string): boolean {
  if (tokenNorm === nameNorm) return true;
  const idx = nameNorm.indexOf(tokenNorm);
  if (idx < 0) return false;
  const before = idx === 0 || nameNorm[idx - 1] === ' ';
  const end = idx + tokenNorm.length;
  const after = end === nameNorm.length || nameNorm[end] === ' ';
  return before && after;
}

/**
 * Casamento por abreviação ALINHADO AO INÍCIO: a i-ésima palavra do token tem de
 * ser prefixo da i-ésima palavra do nome. É o padrão das colunas de largura fixa
 * da RSSSF ("Manchester C" = primeira palavra inteira + inicial da seguinte).
 * Alinhar é essencial: uma regra que pula palavras casaria "Manchester C" também
 * com "Manchester United F.C." por causa do "C" final de "F.C.".
 */
function matchesByAbbrev(tokenNorm: string, nameNorm: string): boolean {
  const tw = tokenNorm.split(' ').filter(Boolean);
  const nw = nameNorm.split(' ').filter(Boolean);
  if (!tw.length || tw.length > nw.length) return false;
  return tw.every((word, i) => nw[i].startsWith(word));
}

function uniqueMatch(
  pool: ClubCandidate[],
  predicate: (c: ClubCandidate) => boolean,
): { club: ClubCandidate | null; ambiguousWith: string[] } {
  const hits = pool.filter(predicate);
  // Ambiguidade é contada por CLUBE (não por nome): dois clubes distintos com o
  // mesmo nome são um empate real e não podem ser resolvidos no chute.
  if (hits.length === 1) return { club: hits[0], ambiguousWith: [] };
  return {
    club: null,
    ambiguousWith: [...new Set(hits.map((h) => `${h.name} (${h.id.slice(0, 8)})`))],
  };
}

export interface ResolveOptions {
  /** Rótulo da temporada no acervo (para `exceptSeasons`). */
  season?: string;
  /** Pool da temporada (participantes já catalogados) — tem precedência. */
  seasonPool?: ClubCandidate[];
  /** Pool global (todos os clubes ativos) — segunda instância. */
  globalPool: ClubCandidate[];
  /** Países aceitos para a competição (ex.: BR; ou os 10 da CONMEBOL). */
  countries: string[];
}

/**
 * Resolve um token da RSSSF. Ordem: ausente declarado → alias → exato (pool da
 * temporada, depois global) → contenção com fronteira → casamento por abreviação.
 * Sempre exige unicidade; empate devolve `ambiguousWith` e clube null.
 */
export function resolveRsssfTeam(token: string, opts: ResolveOptions): TeamResolution {
  const tokenNorm = normalizeTeamName(token);
  // O pool da temporada NÃO passa pelo filtro de país: ele já é, por construção,
  // o conjunto de clubes que o acervo usa naquela competição+temporada. Isso é
  // decisivo na Libertadores, onde vários clubes têm `country` nulo no acervo.
  const season = (opts.seasonPool ?? []).filter((c) => c.gender === 'men');
  const global = opts.globalPool.filter((c) => candidatesFor(c, opts.countries));
  const variants = tokenVariants(tokenNorm);

  if (!tokenNorm) return { token, club: null, via: null, ambiguousWith: [] };
  if (RSSSF_TEAM_ABSENT.has(token)) {
    return { token, club: null, via: null, ambiguousWith: [] };
  }

  const aliasTarget = RSSSF_TEAM_ALIASES[token];
  const aliasBlocked = aliasTarget?.exceptSeasons?.includes(opts.season ?? '') ?? false;
  if (aliasTarget && !aliasBlocked) {
    const targetNorm = normalizeTeamName(aliasTarget.name);
    const cityNorm = aliasTarget.city ? normalizeTeamName(aliasTarget.city) : null;
    const byAlias = (pool: ClubCandidate[]) =>
      uniqueMatch(
        pool,
        (c) =>
          namesOf(c).some((n) => normalizeTeamName(n) === targetNorm) &&
          (!aliasTarget.qid || c.qid === aliasTarget.qid) &&
          (!cityNorm || (c.city != null && normalizeTeamName(c.city) === cityNorm)),
      );
    const inSeason = byAlias(season);
    if (inSeason.club) return { token, club: inSeason.club, via: 'alias', ambiguousWith: [] };
    const inGlobal = byAlias(global);
    if (inGlobal.club) return { token, club: inGlobal.club, via: 'alias', ambiguousWith: [] };
    if (inGlobal.ambiguousWith.length)
      return { token, club: null, via: null, ambiguousWith: inGlobal.ambiguousWith };
  }

  const exact = (pool: ClubCandidate[]) =>
    uniqueMatch(pool, (c) =>
      namesOf(c).some((n) => {
        const norm = normalizeTeamName(n);
        return variants.some((v) => norm === v);
      }),
    );
  const sExact = exact(season);
  if (sExact.club) return { token, club: sExact.club, via: 'pool-exact', ambiguousWith: [] };
  const gExact = exact(global);
  if (gExact.club) return { token, club: gExact.club, via: 'exact', ambiguousWith: [] };
  // Segunda passada de IGUALDADE ignorando o filtro de país: vários clubes
  // sul-americanos têm `country` nulo no acervo (LDU Quito, Millonarios). Só a
  // igualdade de nome passa aqui — contenção/abreviação continuariam restritas
  // ao escopo de país, para não casar homônimo de outro continente.
  const gExactAny = exact(opts.globalPool.filter((c) => c.gender === 'men'));
  if (gExactAny.club) return { token, club: gExactAny.club, via: 'exact', ambiguousWith: [] };

  const contain = (pool: ClubCandidate[]) =>
    uniqueMatch(pool, (c) =>
      namesOf(c).some((n) => {
        const norm = normalizeTeamName(n);
        return variants.some((v) => hasWordBoundarySubstring(v, norm));
      }),
    );
  const sContain = contain(season);
  if (sContain.club) return { token, club: sContain.club, via: 'containment', ambiguousWith: [] };
  const gContain = contain(global);
  if (gContain.club) return { token, club: gContain.club, via: 'containment', ambiguousWith: [] };

  const abbrev = (pool: ClubCandidate[]) =>
    uniqueMatch(pool, (c) =>
      namesOf(c).some((n) => {
        const norm = normalizeTeamName(n);
        return variants.some((v) => matchesByAbbrev(v, norm));
      }),
    );
  const sAbbrev = abbrev(season);
  if (sAbbrev.club) return { token, club: sAbbrev.club, via: 'word-abbrev', ambiguousWith: [] };
  const gAbbrev = abbrev(global);
  if (gAbbrev.club) return { token, club: gAbbrev.club, via: 'word-abbrev', ambiguousWith: [] };

  const ambiguous = [
    ...new Set([...gContain.ambiguousWith, ...gAbbrev.ambiguousWith, ...gExact.ambiguousWith]),
  ];
  return { token, club: null, via: null, ambiguousWith: ambiguous };
}

/** Escopos de país por competição (fonte RSSSF). */
export const CONMEBOL_COUNTRIES = [
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'EC',
  'PY',
  'PE',
  'UY',
  'VE',
] as const;
