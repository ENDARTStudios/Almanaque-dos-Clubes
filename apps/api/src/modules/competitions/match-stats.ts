/**
 * Estatísticas derivadas de PARTIDAS — a base das tarefas 30, 31 e 33.
 *
 * ── DE ONDE VEM, E POR QUE NÃO DO QUE JÁ EXISTE ──────────────────────────────────────────
 * `insights.ts` calcula sobre `CompetitionSeason` (114 linhas no acervo, 19 nas quatro grandes
 * ligas). PARTIDAS são outra ordem de grandeza: **17.265 jogos com placar, rodada e temporada**,
 * distribuídos em 10 temporadas de Premier League, La Liga, Serie A e Brasileirão. Uma tabela
 * histórica de pontos corridos não se sustenta em 19 linhas de resumo; sustenta-se nas partidas.
 *
 * ── A REGRA DE PONTOS, E A HONESTIDADE SOBRE ELA ─────────────────────────────────────────
 * Vitória = 3, empate = 1. Isso vale para TODAS as partidas do acervo (2015-2025). Mas a regra
 * NÃO é universal no tempo: o Brasil adotou 3 pontos em 1995, e competições anteriores a isso
 * usavam 2. Uma tabela histórica que somasse eras diferentes com a mesma régua produziria um
 * total que nunca existiu.
 * Por isso `pontosPorVitoria` é PARÂMETRO, e o resultado declara a régua usada. Hoje o acervo
 * não tem partida antes de 2015, então 3 é correto — mas a função não assume isso.
 *
 * ── O QUE NÃO É INVENTADO ────────────────────────────────────────────────────────────────
 *   - Empate em pontos NÃO é desempatado por saldo de gols silenciosamente: a ordenação usa
 *     pontos, depois saldo, depois gols pró, depois nome — e a posição é declarada como
 *     `position`, com o critério documentado. Ordem é dado, não decoração.
 *   - Partida sem placar não entra em NENHUM agregado (não vira 0×0). No acervo atual são 0,
 *     mas a função filtra em vez de confiar.
 *   - "Maior goleada" é reportada com o placar e o jogo; não é uma frase montada.
 */

export interface MatchRow {
  date: Date;
  /** Rótulo da temporada ("2023", "2023-24"). Usado para separar edições. */
  season: string;
  round: string | null;
  homeClubId: string;
  awayClubId: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface TableRow {
  clubId: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface MatchReference {
  date: Date;
  season: string;
  round: string | null;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  /** Margem absoluta de gols. */
  margin: number;
  /** Total de gols na partida. */
  goals: number;
  /** Quem venceu e quem perdeu. Numa goleada, "maior vitória" e "maior derrota" são o MESMO
   *  jogo visto dos dois lados — por isso o registro carrega os dois papéis em vez de duplicar
   *  a partida em dois campos que sempre teriam o mesmo conteúdo. */
  winnerClubId: string;
  loserClubId: string;
}

export interface CompetitionRecords {
  /** Maior vitória (maior margem). Empate na margem → a de mais gols. */
  biggestWin: MatchReference | null;
  /** Partida com mais gols no total (pode ser empate ou não). */
  highestScoring: MatchReference | null;
  matchesUsed: number;
  totalGoals: number;
  /** Média de gols por partida, com 2 casas. Null quando não há partida. */
  goalsPerMatch: number | null;
  /** Placar 0×0 é resposta legítima, não ausência: por isso é contado à parte. */
  goallessDraws: number;
}

/** Vitória vale 3 desde 1995; 2 antes disso. Parametrizado porque a régua muda a tabela. */
export const PONTOS_POR_VITORIA_PADRAO = 3;

/** Partida utilizável: precisa de placar nos dois lados. Ausência não vira 0×0. */
function temPlacar(m: MatchRow): m is MatchRow & { homeScore: number; awayScore: number } {
  return (
    typeof m.homeScore === 'number' &&
    typeof m.awayScore === 'number' &&
    Number.isFinite(m.homeScore) &&
    Number.isFinite(m.awayScore)
  );
}

interface Acumulado {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Ordena por pontos → saldo → gols pró → id.
 * O último critério é o `clubId`: sem ele, dois clubes idênticos trocariam de posição entre
 * requisições, e a tabela "mudaria" sem nenhum jogo ter acontecido.
 */
function ordenar(clubes: Acumulado[], pontosPorVitoria: number): TableRow[] {
  const pontos = (c: Acumulado) => c.wins * pontosPorVitoria + c.draws;
  return [...clubes]
    .sort((a, b) => {
      const pa = pontos(a);
      const pb = pontos(b);
      if (pb !== pa) return pb - pa;
      const sa = a.goalsFor - a.goalsAgainst;
      const sb = b.goalsFor - b.goalsAgainst;
      if (sb !== sa) return sb - sa;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0;
    })
    .map((c, i) => ({
      clubId: c.clubId,
      position: i + 1,
      played: c.played,
      wins: c.wins,
      draws: c.draws,
      losses: c.losses,
      goalsFor: c.goalsFor,
      goalsAgainst: c.goalsAgainst,
      goalDifference: c.goalsFor - c.goalsAgainst,
      points: pontos(c),
    }));
}

/**
 * Tabela de pontos corridos construída a partir das partidas.
 *
 * Aceita qualquer subconjunto de partidas: a tabela geral de uma competição, uma temporada, ou
 * o acumulado até certa rodada (é assim que a tarefa 31 é montada).
 */
export function buildTable(
  matches: MatchRow[],
  pontosPorVitoria: number = PONTOS_POR_VITORIA_PADRAO,
): TableRow[] {
  const porClube = new Map<string, Acumulado>();
  const pegar = (id: string): Acumulado => {
    const atual = porClube.get(id);
    if (atual) return atual;
    const novo: Acumulado = {
      clubId: id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
    porClube.set(id, novo);
    return novo;
  };

  for (const m of matches) {
    if (!temPlacar(m)) continue;
    const casa = pegar(m.homeClubId);
    const fora = pegar(m.awayClubId);
    casa.played++;
    fora.played++;
    casa.goalsFor += m.homeScore;
    casa.goalsAgainst += m.awayScore;
    fora.goalsFor += m.awayScore;
    fora.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      casa.wins++;
      fora.losses++;
    } else if (m.homeScore < m.awayScore) {
      fora.wins++;
      casa.losses++;
    } else {
      casa.draws++;
      fora.draws++;
    }
  }

  return ordenar([...porClube.values()], pontosPorVitoria);
}

/** Recordes de uma competição (ou temporada): maior vitória, jogo com mais gols, maior derrota. */
export function buildRecords(matches: MatchRow[]): CompetitionRecords {
  const validas = matches.filter(temPlacar);
  if (validas.length === 0) {
    return {
      biggestWin: null,
      highestScoring: null,
      matchesUsed: 0,
      totalGoals: 0,
      goalsPerMatch: null,
      goallessDraws: 0,
    };
  }

  const ref = (m: MatchRow & { homeScore: number; awayScore: number }): MatchReference => ({
    date: m.date,
    season: m.season,
    round: m.round,
    homeClubId: m.homeClubId,
    awayClubId: m.awayClubId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    margin: Math.abs(m.homeScore - m.awayScore),
    goals: m.homeScore + m.awayScore,
    winnerClubId: m.homeScore > m.awayScore ? m.homeClubId : m.awayClubId,
    loserClubId: m.homeScore > m.awayScore ? m.awayClubId : m.homeClubId,
  });

  let biggestWin = ref(validas[0]);
  let highestScoring = ref(validas[0]);
  let totalGoals = 0;
  let goallessDraws = 0;
  for (const m of validas) {
    const r = ref(m);
    totalGoals += r.goals;
    if (r.goals === 0) goallessDraws++;
    /* Margem maior ganha; empate na margem fica com a partida de mais gols (4×0 vence 1×0),
       e empate também nisso fica com a PRIMEIRA encontrada — critério estável, para o recorde
       não trocar de dono entre duas requisições sem nenhum jogo novo. */
    if (
      r.margin > biggestWin.margin ||
      (r.margin === biggestWin.margin && r.goals > biggestWin.goals)
    ) {
      biggestWin = r;
    }
    if (r.goals > highestScoring.goals) highestScoring = r;
  }

  return {
    biggestWin,
    highestScoring,
    matchesUsed: validas.length,
    totalGoals,
    goalsPerMatch: Math.round((totalGoals / validas.length) * 100) / 100,
    goallessDraws,
  };
}

export interface RoundTable {
  round: string;
  /** Número da rodada quando ela é numérica; null para "final", "semifinal", "grupo A". */
  roundNumber: number | null;
  /** Partidas desta rodada (apenas as com placar). */
  matchesInRound: number;
  /** Classificação ACUMULADA até o fim desta rodada, inclusive. */
  table: TableRow[];
}

/**
 * Classificação rodada a rodada — a tarefa 31 (quem subiu e caiu jogo a jogo).
 *
 * Ordena as rodadas com critério NUMÉRICO quando possível: "10" depois de "9", e não depois de
 * "1" (ordenação de texto poria "10" antes de "2"). Rodadas não numéricas ("final", "semifinal")
 * vão para o fim, na ordem em que aparecem — não há como compará-las por número.
 *
 * `previous` em cada linha é preenchido pelo consumidor comparando com a rodada anterior; a
 * função devolve a tabela de cada rodada e deixa a diferença de posição explícita no resultado
 * (`positionChange`), porque é ela que a interface desenha.
 */
export function buildRoundEvolution(matches: MatchRow[]): RoundTable[] {
  const porRodada = new Map<string, MatchRow[]>();
  for (const m of matches) {
    if (!temPlacar(m)) continue;
    const chave = m.round === null || m.round === '' ? '(sem rodada)' : m.round;
    if (!porRodada.has(chave)) porRodada.set(chave, []);
    porRodada.get(chave)!.push(m);
  }

  const numeroDaRodada = (r: string): number | null => {
    const n = Number.parseInt(r, 10);
    return Number.isInteger(n) && String(n) === r.trim() ? n : null;
  };

  const rodadas = [...porRodada.keys()].sort((a, b) => {
    const na = numeroDaRodada(a);
    const nb = numeroDaRodada(b);
    if (na !== null && nb !== null) return na - nb;
    if (na !== null) return -1; // numérica antes de não numérica
    if (nb !== null) return 1;
    return a.localeCompare(b);
  });

  const acumuladas: MatchRow[] = [];
  const saida: RoundTable[] = [];
  for (const round of rodadas) {
    acumuladas.push(...porRodada.get(round)!);
    saida.push({
      round,
      roundNumber: numeroDaRodada(round),
      matchesInRound: porRodada.get(round)!.length,
      table: buildTable(acumuladas),
    });
  }
  return saida;
}

/**
 * Variação de posição de cada clube entre duas tabelas.
 * Positivo = subiu (posição menor). Clube que não estava na tabela anterior entra com `null` —
 * não é "subiu 0", é "não estava".
 */
export function positionChanges(
  anterior: TableRow[],
  atual: TableRow[],
): Map<string, number | null> {
  const antes = new Map(anterior.map((r) => [r.clubId, r.position]));
  const out = new Map<string, number | null>();
  for (const r of atual) {
    const p = antes.get(r.clubId);
    out.set(r.clubId, p === undefined ? null : p - r.position);
  }
  return out;
}

export interface SeasonChampion {
  season: string;
  clubId: string;
  points: number;
}

/**
 * Campeão de cada temporada DERIVADO das partidas (maior pontuação).
 *
 * Isto não substitui `CompetitionSeason.championId` — é uma segunda opinião, e serve para os
 * casos em que o resumo não foi catalogado. Onde os dois existem, divergência é sinal de dado
 * inconsistente, não de empate.
 */
export function championsBySeason(matches: MatchRow[]): SeasonChampion[] {
  const porTemporada = new Map<string, MatchRow[]>();
  for (const m of matches) {
    if (!temPlacar(m)) continue;
    if (!porTemporada.has(m.season)) porTemporada.set(m.season, []);
    porTemporada.get(m.season)!.push(m);
  }
  const out: SeasonChampion[] = [];
  for (const [season, jogos] of porTemporada) {
    const tabela = buildTable(jogos);
    const lider = tabela[0];
    if (lider) out.push({ season, clubId: lider.clubId, points: lider.points });
  }
  return out.sort((a, b) => a.season.localeCompare(b.season));
}
