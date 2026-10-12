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
};

/**
 * Times que a fonte imprime e o acervo NÃO tem — verificado em produção. Nunca
 * casam (o jogo vira gap declarado em vez de um match aproximado).
 * `Vasco da Gama`: o acervo só tem o feminino e um homônimo português; o clube
 * masculino do Rio (Q5014111 é o poliesportivo, gravado como `women`) está ausente.
 */
export const RSSSF_TEAM_ABSENT: ReadonlySet<string> = new Set([
  'Chapecoense',
  'Vasco da Gama',
  'Monagas SC',
  'Deportivo Táchira FC',
  'Patronato',
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
  if (aliasTarget) {
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
