/**
 * T512 — ingestão de CLUBES AUSENTES por QID (Wikidata CC0).
 *
 * Motivação (medida ao vivo no T510): o acervo NÃO tem Liverpool F.C., FC
 * Barcelona, Boca Juniors e outros clubes de elite — por isso temporadas já
 * gravadas ficaram com `championId`/`runnerUpId` = null (a regra do QID
 * resolvido do T510 recusa casar por nome aproximado, que é o certo).
 *
 * ⚠️ LIÇÃO T424 (6ª vez, agora em ESCALA): a lista de 20 QIDs recebida estava
 * **19/20 ERRADA** — Q113013 é "literatura pós-moderna", Q8776 é "Abraham de
 * Moivre", Q19629 é o ano "1147", Q49724 é a banda "Hoobastank", Q19648 é o
 * Fenerbahçe… Portanto os QIDs NÃO são digitados: são DERIVADOS do artigo da
 * Wikipédia (de onde os clubes faltantes apareceram) e VALIDADOS contra o
 * Wikidata antes de qualquer escrita.
 *
 * Interface: por PADRÃO usa a lista curada `TARGET_CLUBS` (lang + artigo) e
 * resolve o QID via `prop=pageprops`. `--qid=Q1,Q2` permite QIDs explícitos
 * (validados com a MESMA regra).
 *
 * Validação de "é clube de futebol" (cobre os formatos reais do Wikidata):
 *   P31 ∋ Q476028 (association football club)  OU  (P641 ∋ Q2736 ∧ P115 presente)
 *   E P17 (país) presente, com P297 (ISO-3166-1 alpha-2) resolvível.
 * Rejeita ligas, seleções, estádios e pessoas.
 *
 * Idempotência: nunca cria duplicata (dedup por QID); se existir clube vivo com
 * o MESMO nome e sem QID, ANEXA o QID e preenche só campos nulos (zero overwrite).
 *
 * Uso (produção, dentro do container):
 *   node dist/scripts/seed-clubs-by-qid.js                # DRY-RUN
 *   node dist/scripts/seed-clubs-by-qid.js --apply
 * Reversível por proveniência:
 *   DELETE FROM clubs WHERE "importedFrom"='wikidata-t512';
 */
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { commonsFilePath } from '../modules/etl/connectors/wikidata-media.connector.js';
import { logger } from '../config/logger.js';

const UA =
  'AlmanaqueDosClubes/0.1 (clubs by qid; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** QIDs canônicos da validação (verificados ao vivo 10/10). */
export const QID_FOOTBALL_CLUB = 'Q476028';
export const QID_ASSOCIATION_FOOTBALL = 'Q2736';
export const PROP_SPORT = 'P641';
export const PROP_HOME_VENUE = 'P115';

/**
 * Lista curada: clube alvo → artigo da Wikipédia de origem. Os QIDs são
 * DERIVADOS destes artigos (nunca digitados: ver o aviso da lição T424).
 */
export const TARGET_CLUBS: Array<{ lang: 'en' | 'es' | 'pt'; article: string; note: string }> = [
  { lang: 'en', article: 'Liverpool F.C.', note: 'campeão Premier League 2024-25' },
  { lang: 'en', article: 'Leeds United F.C.', note: 'Premier League 2021-22/2022-23' },
  { lang: 'es', article: 'Fútbol Club Barcelona', note: 'campeão La Liga (várias temporadas)' },
  { lang: 'es', article: 'Girona Fútbol Club', note: 'La Liga' },
  { lang: 'es', article: 'Real Sociedad de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Villarreal Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Valencia Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Club Atlético Osasuna', note: 'La Liga' },
  { lang: 'es', article: 'Sevilla Fútbol Club', note: 'La Liga' },
  { lang: 'es', article: 'Unión Deportiva Las Palmas', note: 'La Liga' },
  { lang: 'es', article: 'Rayo Vallecano de Madrid', note: 'La Liga' },
  { lang: 'es', article: 'Cádiz Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Unión Deportiva Almería', note: 'La Liga' },
  { lang: 'es', article: 'Real Valladolid Club de Fútbol', note: 'La Liga' },
  { lang: 'es', article: 'Club Deportivo Leganés', note: 'La Liga' },
  { lang: 'es', article: 'Real Oviedo', note: 'La Liga' },
  { lang: 'es', article: 'Elche Club de Fútbol', note: 'La Liga' },
  { lang: 'pt', article: 'Club Atlético Boca Juniors', note: 'vice Libertadores 2023' },
  { lang: 'pt', article: 'Club Atlético San Lorenzo de Almagro', note: 'Libertadores' },
  { lang: 'pt', article: 'Club Libertad', note: 'Libertadores' },
  { lang: 'pt', article: 'Club The Strongest', note: 'Libertadores' },
];

/**
 * T513 — clubes ausentes de Bundesliga / Ligue 1 (Eredivisie não teve nenhum).
 * Derivados dos ARTIGOS das tabelas de classificação (15 temporadas parseadas,
 * artigos → QIDs → diff contra o acervo). NUNCA digitados (regra D-2026-10-09).
 */
export const TARGET_CLUBS_T513: Array<{ lang: 'de' | 'fr'; article: string; note: string }> = [
  { lang: 'de', article: '1. FC Heidenheim', note: 'Bundesliga' },
  { lang: 'de', article: 'FC Augsburg', note: 'Bundesliga' },
  { lang: 'de', article: 'Hamburger SV', note: 'Bundesliga' },
  { lang: 'de', article: 'RB Leipzig', note: 'Bundesliga' },
  { lang: 'de', article: 'Werder Bremen', note: 'Bundesliga' },
  { lang: 'fr', article: "Angers Sporting Club de l'Ouest", note: 'Ligue 1' },
  { lang: 'fr', article: 'Athletic Club ajaccien', note: 'Ligue 1' },
  { lang: 'fr', article: 'Clermont Foot 63', note: 'Ligue 1' },
  { lang: 'fr', article: 'Football Club des Girondins de Bordeaux', note: 'Ligue 1' },
  { lang: 'fr', article: 'Le Havre Athletic Club (football)', note: 'Ligue 1' },
];

/**
 * T514 — clubes ausentes de Champions League / Europa League / Primeira Liga.
 * Derivados dos ARTIGOS das tabelas (10 temporadas UCL/UEL + 5 da Primeira Liga
 * parseadas → 144 QIDs → diff contra o acervo: 130 já existiam, sobraram 14).
 * São os mercados menores (UKR, CRO, ISR, GRE, CYP, AZE, SRB, POL, BUL, POR).
 */
export const TARGET_CLUBS_T514: Array<{ lang: 'en' | 'pt'; article: string; note: string }> = [
  { lang: 'en', article: 'FC Shakhtar Donetsk', note: 'UCL' },
  { lang: 'en', article: 'GNK Dinamo Zagreb', note: 'UCL' },
  { lang: 'en', article: 'Maccabi Haifa F.C.', note: 'UCL' },
  { lang: 'en', article: 'Olympiacos F.C.', note: 'UCL' },
  { lang: 'en', article: 'Pafos FC', note: 'UCL' },
  { lang: 'en', article: 'Qarabağ FK', note: 'UCL' },
  { lang: 'en', article: 'Red Star Belgrade', note: 'UCL' },
  { lang: 'en', article: 'AEK Athens F.C.', note: 'UEL' },
  { lang: 'en', article: 'AEK Larnaca FC', note: 'UEL' },
  { lang: 'en', article: 'FK RFS', note: 'UEL' },
  { lang: 'en', article: 'Legia Warsaw', note: 'UEL' },
  { lang: 'en', article: 'PAOK FC', note: 'UEL' },
  { lang: 'en', article: 'PFC Ludogorets Razgrad', note: 'UEL' },
  { lang: 'pt', article: 'C.F. Estrela da Amadora', note: 'Primeira Liga' },
];

/**
 * T515 — clubes ausentes de Série B, MLS e Liga MX. Derivados dos ARTIGOS das
 * tabelas (15 temporadas parseadas → 91 QIDs → diff contra o acervo: 34 já
 * existiam, 57 ausentes). Atenção: Vasco e Chapecoense existem no acervo SEM
 * QID — o ingest ANEXA o QID (nunca duplica).
 */
export const TARGET_CLUBS_T515: Array<{ lang: 'en' | 'pt'; article: string; note: string }> = [
  { lang: 'pt', article: 'ABC Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'Amazonas Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'América Futebol Clube (Belo Horizonte)', note: 'Série B' },
  { lang: 'pt', article: 'Associação Chapecoense de Futebol', note: 'Série B' },
  { lang: 'pt', article: 'Associação Desportiva Confiança', note: 'Série B' },
  { lang: 'pt', article: 'Associação Ferroviária de Esportes', note: 'Série B' },
  { lang: 'pt', article: 'Athletic Club (Minas Gerais)', note: 'Série B' },
  { lang: 'pt', article: 'Botafogo Futebol Clube (Ribeirão Preto)', note: 'Série B' },
  { lang: 'pt', article: 'Brusque Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'Centro Sportivo Alagoano', note: 'Série B' },
  { lang: 'pt', article: 'Club de Regatas Vasco da Gama', note: 'Série B' },
  { lang: 'pt', article: 'Clube do Remo', note: 'Série B' },
  { lang: 'pt', article: 'Coritiba Foot Ball Club', note: 'Série B' },
  { lang: 'pt', article: 'Cuiabá Esporte Clube', note: 'Série B' },
  { lang: 'pt', article: 'Esporte Clube Vitória', note: 'Série B' },
  { lang: 'pt', article: 'Goiás Esporte Clube', note: 'Série B' },
  { lang: 'pt', article: 'Grêmio Esportivo Brasil', note: 'Série B' },
  { lang: 'pt', article: 'Guarani Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'Ituano Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'Londrina Esporte Clube', note: 'Série B' },
  { lang: 'pt', article: 'Mirassol Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'Paysandu Sport Club', note: 'Série B' },
  { lang: 'pt', article: 'Sampaio Corrêa Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'Tombense Futebol Clube', note: 'Série B' },
  { lang: 'pt', article: 'Volta Redonda Futebol Clube', note: 'Série B' },
  { lang: 'en', article: 'Atlanta United FC', note: 'MLS' },
  { lang: 'en', article: 'Austin FC', note: 'MLS' },
  { lang: 'en', article: 'CF Montréal', note: 'MLS' },
  { lang: 'en', article: 'Charlotte FC', note: 'MLS' },
  { lang: 'en', article: 'Chicago Fire FC', note: 'MLS' },
  { lang: 'en', article: 'Columbus Crew', note: 'MLS' },
  { lang: 'en', article: 'FC Cincinnati', note: 'MLS' },
  { lang: 'en', article: 'Houston Dynamo FC', note: 'MLS' },
  { lang: 'en', article: 'Inter Miami CF', note: 'MLS' },
  { lang: 'en', article: 'Los Angeles FC', note: 'MLS' },
  { lang: 'en', article: 'Minnesota United FC', note: 'MLS' },
  { lang: 'en', article: 'Nashville SC', note: 'MLS' },
  { lang: 'en', article: 'New England Revolution', note: 'MLS' },
  { lang: 'en', article: 'New York City FC', note: 'MLS' },
  { lang: 'en', article: 'Orlando City SC', note: 'MLS' },
  { lang: 'en', article: 'San Diego FC', note: 'MLS' },
  { lang: 'en', article: 'Sporting Kansas City', note: 'MLS' },
  { lang: 'en', article: 'St. Louis City SC', note: 'MLS' },
  { lang: 'en', article: 'Toronto FC', note: 'MLS' },
  { lang: 'en', article: 'Atlético San Luis', note: 'Liga MX' },
  { lang: 'en', article: 'C.F. Monterrey', note: 'Liga MX' },
  { lang: 'en', article: 'C.F. Pachuca', note: 'Liga MX' },
  { lang: 'en', article: 'Club América', note: 'Liga MX' },
  { lang: 'en', article: 'Club Necaxa', note: 'Liga MX' },
  { lang: 'en', article: 'Club Tijuana', note: 'Liga MX' },
  { lang: 'en', article: 'Club Universidad Nacional', note: 'Liga MX' },
  { lang: 'en', article: 'Cruz Azul', note: 'Liga MX' },
  { lang: 'en', article: 'Deportivo Toluca F.C.', note: 'Liga MX' },
  { lang: 'en', article: 'FC Juárez', note: 'Liga MX' },
  { lang: 'en', article: 'Mazatlán F.C.', note: 'Liga MX' },
  { lang: 'en', article: 'Santos Laguna', note: 'Liga MX' },
  { lang: 'en', article: 'Tigres UANL', note: 'Liga MX' },
];

/**
 * T516 — clubes ausentes da Copa Sul-Americana, Recopa e Mundial de Clubes.
 * Derivados dos ARTIGOS das tabelas/caixas (15 temporadas → 145 QIDs → diff: 114
 * já existiam, 31 "faltantes") — mas 5 NÃO eram clubes (país Venezuela, AFA, CBF,
 * FIFA e o árbitro Facundo Tello) e saíram da curadoria; a validação do ingest
 * os recusaria de qualquer forma.
 */
export const TARGET_CLUBS_T516: Array<{ lang: 'pt'; article: string; note: string }> = [
  { lang: 'pt', article: '12 de Octubre Football Club', note: 'Sudamericana' },
  { lang: 'pt', article: '9 de Octubre Fútbol Club', note: 'Sudamericana' },
  { lang: 'pt', article: 'Academia Puerto Cabello', note: 'Sudamericana' },
  { lang: 'pt', article: 'Alianza Fútbol Club (Colômbia)', note: 'Sudamericana' },
  { lang: 'pt', article: 'Arsenal Fútbol Club', note: 'Sudamericana' },
  { lang: 'pt', article: 'Caracas Fútbol Club', note: 'Sudamericana' },
  { lang: 'pt', article: 'Club Always Ready', note: 'Sudamericana' },
  { lang: 'pt', article: 'Club Atlético Belgrano', note: 'Sudamericana' },
  { lang: 'pt', article: 'Club Atlético River Plate (Assunção)', note: 'Sudamericana' },
  { lang: 'pt', article: 'Club Deportivo Universidad Católica (Equador)', note: 'Sudamericana' },
  { lang: 'pt', article: 'Club General Caballero (Juan León Mallorquín)', note: 'Sudamericana' },
  {
    lang: 'pt',
    article: 'Club Gualberto Villarroel Club Deportivo San José',
    note: 'Sudamericana',
  },
  { lang: 'pt', article: 'Club Sportivo Ameliano', note: 'Sudamericana' },
  { lang: 'pt', article: 'Club Sportivo Trinidense', note: 'Sudamericana' },
  { lang: 'pt', article: 'Club de Gimnasia y Esgrima La Plata', note: 'Sudamericana' },
  { lang: 'pt', article: 'Delfín Sporting Club', note: 'Sudamericana' },
  { lang: 'pt', article: 'Deportivo Rayo Zuliano', note: 'Sudamericana' },
  { lang: 'pt', article: 'Guaireña Fútbol Club', note: 'Sudamericana' },
  { lang: 'pt', article: 'Metropolitanos Fútbol Club', note: 'Sudamericana' },
  { lang: 'pt', article: 'Red Bull Bragantino', note: 'Sudamericana' },
  { lang: 'pt', article: 'Sociedad Deportiva Aucas', note: 'Sudamericana' },
  { lang: 'pt', article: 'Al Ain Football Club', note: 'Mundial de Clubes' },
  { lang: 'pt', article: 'Al-Ittihad FC', note: 'Mundial de Clubes' },
  { lang: 'pt', article: 'Association Sportive Pirae', note: 'Mundial de Clubes' },
  { lang: 'pt', article: 'Mamelodi Sundowns Football Club', note: 'Mundial de Clubes' },
  { lang: 'pt', article: 'Wydad Athletic Club', note: 'Mundial de Clubes' },
];

/**
 * T517 — SELEÇÕES ausentes das Olimpíadas (sub-23/olímpica e feminino).
 */
export const TARGET_NATIONS_T517: Array<{ lang: 'en'; article: string; note: string }> = [
  { lang: 'en', article: 'Argentina national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Brazil national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Nigeria national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Germany national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Uruguay national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Morocco national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Gabon national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Ivory Coast national under-23 football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'South Africa national under-23 soccer team', note: 'Olimpíadas M' },
  {
    lang: 'en',
    article: "New Zealand men's national under-23 football team",
    note: 'Olimpíadas M',
  },
  { lang: 'en', article: 'New Zealand Olympic national football team', note: 'Olimpíadas M' },
  { lang: 'en', article: "Australia men's national under-23 soccer team", note: 'Olimpíadas M' },
  { lang: 'en', article: 'Japan Olympic football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Honduras Olympic football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'Guinea Olympic football team', note: 'Olimpíadas M' },
  { lang: 'en', article: 'South Africa Olympic national soccer team', note: 'Olimpíadas M' },
  { lang: 'en', article: "Brazil women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Sweden women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Canada women's national soccer team", note: 'Olimpíadas F' },
  { lang: 'en', article: "North Korea women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Argentina women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Nigeria women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Great Britain women's Olympic football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "South Africa women's national soccer team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Colombia women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Cameroon women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Australia women's national soccer team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Netherlands women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Zambia women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Chile women's national football team", note: 'Olimpíadas F' },
  { lang: 'en', article: "Spain women's national football team", note: 'Olimpíadas F' },
];

/** Todas as ondas curadas (--wave=all, default). */
export const ALL_TARGET_CLUBS = [
  ...TARGET_CLUBS,
  ...TARGET_CLUBS_T513,
  ...TARGET_CLUBS_T514,
  ...TARGET_CLUBS_T515,
  ...TARGET_CLUBS_T516,
  ...TARGET_NATIONS_T517,
];

// ---------------------------------------------------------------------------
// Tipos/leitores do Wikidata (subconjunto usado)
// ---------------------------------------------------------------------------

interface Claim {
  mainsnak?: { datavalue?: { value?: unknown } };
  /** 'preferred' | 'normal' | 'deprecated' — o Wikidata marca o valor ATUAL como preferred. */
  rank?: string;
  /**
   * Qualificadores são SNAKS CRUS — NÃO têm o wrapper `mainsnak` que a claim tem:
   * o caminho é `qualifiers.P580[0].datavalue.value.time` (e não `...mainsnak...`).
   */
  qualifiers?: Record<string, Array<{ datavalue?: { value?: unknown } }>>;
}
interface Entity {
  missing?: boolean;
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  claims?: Record<string, Claim[]>;
}

/** Valores crus de uma propriedade. */
export function claimValues(entity: Entity, prop: string): unknown[] {
  return (entity.claims?.[prop] ?? [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v) => v !== undefined && v !== null);
}

/** IDs de entidade (ex.: P31 → ['Q476028']). */
export function claimIds(entity: Entity, prop: string): string[] {
  return claimValues(entity, prop)
    .map((v) =>
      typeof v === 'object' && v !== null && 'id' in v ? (v as { id?: string }).id : undefined,
    )
    .filter((x): x is string => !!x);
}

/** Valor textual (commonsMedia/string) — ex.: P18. */
function claimString(entity: Entity, prop: string): string | null {
  for (const v of claimValues(entity, prop)) if (typeof v === 'string') return v;
  return null;
}

/** Quantidade (ex.: P1083 capacidade) → inteiro. */
function claimAmount(entity: Entity, prop: string): number | null {
  for (const v of claimValues(entity, prop)) {
    if (typeof v === 'object' && v !== null && 'amount' in v) {
      const n = Number.parseInt(
        String((v as { amount?: string }).amount ?? '').replace(/[^\d]/g, ''),
        10,
      );
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Predicado PURO: a entidade é um CLUBE DE FUTEBOL?
 * Cobre os dois formatos reais (clube dedicado e clube poliesportivo — Barcelona,
 * Boca e San Lorenzo NÃO têm P31=Q476028, só P641=Q2736).
 */
export function isFootballClubEntity(entity: Entity): boolean {
  const p31 = claimIds(entity, 'P31');
  const sport = claimIds(entity, PROP_SPORT);
  const hasVenue = claimIds(entity, PROP_HOME_VENUE).length > 0;
  return p31.includes(QID_FOOTBALL_CLUB) || (sport.includes(QID_ASSOCIATION_FOOTBALL) && hasVenue);
}

/**
 * T517 — SELEÇÃO NACIONAL (qualquer variante: sênior, feminina, sub-23, olímpica).
 * Não têm estádio próprio (P115 ausente) e o P31 VARIA muito (Q6979593 "national
 * association football team", Q15944511, Q23759293… — a sub-23 do Brasil, por
 * exemplo, NÃO tem Q6979593). Regra: futebol (P641=Q2736) + país (P17) + NÃO ser
 * clube de futebol (P31 ∌ Q476028).
 */
/** Classes de SELEÇÃO vistas no Wikidata (validadas por observação no T517). */
export const NATIONAL_TEAM_CLASSES = new Set([
  'Q6979593', // national association football team
  'Q23759293', // national under-23 association football team
  'Q15944511', // national under-21/under-23 association football team
  'Q23905105', // women's national association football team
]);

export function isNationalTeamEntity(entity: Entity): boolean {
  const p31 = claimIds(entity, 'P31');
  const sport = claimIds(entity, PROP_SPORT);
  const country = claimIds(entity, 'P17')[0];
  // P17 pode faltar (a sub-23 da GUINÉ não tem P17) — a classe de seleção supre.
  const isNatClass = p31.some((q) => NATIONAL_TEAM_CLASSES.has(q));
  return (
    sport.includes(QID_ASSOCIATION_FOOTBALL) &&
    !p31.includes(QID_FOOTBALL_CLUB) &&
    (!!country || isNatClass)
  );
}

/** Gênero da seleção a partir do rótulo/descrição (o acervo separa men/women). */
export function nationalTeamGender(entity: Entity): 'men' | 'women' {
  const txt = [
    entity.labels?.en?.value,
    entity.labels?.pt?.value,
    entity.descriptions?.en?.value,
    entity.descriptions?.pt?.value,
  ]
    .filter(Boolean)
    .join(' ');
  return /women|feminin|femenin/i.test(txt) ? 'women' : 'men';
}

/** Ano de fundação (P571), ou null. */
/**
 * Ano de fundação (P571). Com VÁRIOS valores, usa o MAIS ANTIGO (fundação é a
 * inception mais antiga) — os primeiros valores costumam ser ruído: Q145 (Reino
 * Unido) tem 1921 e 1927, Q29 (Espanha) começa em 1715.
 */
export function foundedYearOf(entity: Entity): number | null {
  const years: number[] = [];
  for (const v of claimValues(entity, 'P571')) {
    if (typeof v === 'object' && v !== null && 'time' in v) {
      const m = /^[+-](\d{4})/.exec(String((v as { time?: string }).time ?? ''));
      if (m) years.push(Number.parseInt(m[1], 10));
    }
  }
  return years.length > 0 ? Math.min(...years) : null;
}

/**
 * Idioma preferido do rótulo por país — segue a convenção JÁ existente no acervo
 * (espanhóis vêm com o rótulo es: "Real Madrid Club de Fútbol", "Getafe Club de
 * Fútbol"; ingleses com en: "Manchester City F.C."; brasileiros/sul-americanos
 * com pt). Fallback: pt → en → es.
 */
export const LABEL_LANG_BY_ISO: Record<string, string> = {
  GB: 'en',
  IE: 'en',
  ES: 'es',
  IT: 'it',
  AR: 'es',
  UY: 'es',
  CL: 'es',
  CO: 'es',
  PE: 'es',
  EC: 'es',
  VE: 'es',
  PY: 'es',
  BO: 'es',
  MX: 'es',
  BR: 'pt',
  PT: 'pt',
};

/** Nome no acervo: rótulo do idioma do país, com fallback pt → en → es. */
export function pickName(entity: Entity, iso?: string | null): string | null {
  const order =
    iso && LABEL_LANG_BY_ISO[iso] ? [LABEL_LANG_BY_ISO[iso], 'pt', 'en', 'es'] : ['pt', 'en', 'es'];
  for (const lang of order) {
    const v = entity.labels?.[lang]?.value?.trim();
    if (v) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------------

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Resolve artigos → QIDs (lotes por idioma, honrando normalized/redirects). */
async function resolveArticleQids(
  targets: Array<{ lang: string; article: string }>,
): Promise<Map<string, string>> {
  const byLang = new Map<string, string[]>();
  for (const t of targets) byLang.set(t.lang, [...(byLang.get(t.lang) ?? []), t.article]);
  const out = new Map<string, string>();
  for (const [lang, titles] of byLang) {
    const url =
      `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item` +
      `&titles=${encodeURIComponent(titles.join('|'))}&redirects=1&format=json&formatversion=2`;
    const json = (await fetchJson(url)) as {
      query?: {
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
        pages?: Array<{ title?: string; pageprops?: { wikibase_item?: string } }>;
      };
    };
    const norm = new Map((json.query?.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((json.query?.redirects ?? []).map((r) => [r.from, r.to]));
    const page = new Map(
      (json.query?.pages ?? []).map((p) => [p.title ?? '', p.pageprops?.wikibase_item]),
    );
    for (const t of titles) {
      const t1 = norm.get(t) ?? t;
      const t2 = redir.get(t1) ?? t1;
      const qid = page.get(t2) ?? page.get(t1) ?? page.get(t);
      if (qid) out.set(`${lang}|${t}`, qid);
    }
    await sleep(900);
  }
  return out;
}

async function fetchEntities(ids: string[]): Promise<Record<string, Entity>> {
  const out: Record<string, Entity> = {};
  for (let i = 0; i < ids.length; i += 45) {
    const url =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.slice(i, i + 45).join('|')}` +
      `&props=labels|descriptions|claims&languages=pt|en|es&format=json`;
    const json = (await fetchJson(url)) as { entities?: Record<string, Entity> };
    Object.assign(out, json.entities ?? {});
    await sleep(900);
  }
  return out;
}

/** ISO-3166-1 alpha-2 (P297) por QID de país. */
async function resolveCountryIso(qids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (qids.length === 0) return map;
  const json = (await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=claims&format=json`,
  )) as { entities?: Record<string, Entity> };
  for (const [qid, e] of Object.entries(json.entities ?? {})) {
    // P297 é datatype STRING (external-id) → o valor é "ES", não { id: 'ES' }
    const iso = claimString(e, 'P297');
    if (iso) map.set(qid, iso.toUpperCase());
  }
  return map;
}

export interface Venue {
  entity: Entity;
  capacity: number | null;
  image: string | null;
}

/** Estádio (P115): entidade + capacidade (P1083) + imagem (P18 → Commons). */
async function resolveVenues(qids: string[]): Promise<Map<string, Venue>> {
  const map = new Map<string, Venue>();
  if (qids.length === 0) return map;
  const json = (await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}` +
      `&props=labels|claims&languages=pt|en|es|it&format=json`,
  )) as { entities?: Record<string, Entity> };
  for (const [qid, e] of Object.entries(json.entities ?? {})) {
    const image = claimString(e, 'P18');
    map.set(qid, {
      entity: e,
      capacity: claimAmount(e, 'P1083'),
      image: image ? commonsFilePath(image) : null,
    });
  }
  return map;
}

/**
 * Escolhe o estádio ATUAL do clube entre os P115 (que listam a HISTÓRIA):
 *   1) rank `preferred` (o Wikidata marca o valor atual assim — FC Barcelona:
 *      Camp Nou);
 *   2) senão, o `P580` (início) MAIS RECENTE (San Lorenzo: Nuevo Gasómetro/1993,
 *      não o Gasómetro antigo de 75 mil lugares);
 *   3) desempate por MAIOR capacidade.
 * Claims `deprecated` são descartadas. `venues` já resolvido por QID.
 */
export function pickVenue(
  entity: Entity,
  venues: Map<string, Venue>,
): { qid: string; venue: Venue } | null {
  const claimQid = (c: Claim): string | undefined => {
    const v = c.mainsnak?.datavalue?.value;
    return typeof v === 'object' && v !== null && 'id' in v ? (v as { id?: string }).id : undefined;
  };
  const startYear = (c: Claim): number => {
    // qualificador = snak cru (NÃO tem o wrapper `mainsnak` da claim)
    const time = (c.qualifiers?.P580?.[0]?.datavalue?.value as { time?: string } | undefined)?.time;
    const y = time ? Number.parseInt(time.slice(1, 5), 10) : NaN;
    return Number.isFinite(y) ? y : -Infinity;
  };

  const candidates = (entity.claims?.[PROP_HOME_VENUE] ?? [])
    .filter((c) => c.rank !== 'deprecated')
    .flatMap((c) => {
      const qid = claimQid(c);
      if (!qid || !venues.has(qid)) return [];
      return [{ qid, rank: c.rank ?? 'normal', start: startYear(c) }];
    });

  const preferred = candidates.filter((x) => x.rank === 'preferred');
  const pool = preferred.length > 0 ? preferred : candidates;

  let best: { qid: string; venue: Venue } | null = null;
  let bestStart = -Infinity;
  for (const { qid, start } of pool) {
    const venue = venues.get(qid) as Venue;
    const better =
      !best ||
      start > bestStart ||
      (start === bestStart && (venue.capacity ?? 0) > (best.venue.capacity ?? 0));
    if (better) {
      best = { qid, venue };
      bestStart = start;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      apply: { type: 'boolean', default: false },
      qid: { type: 'string', default: '' },
      // onda curada: 'all' (default) | 't512' | 't513'
      wave: { type: 'string', default: 'all' },
      // 'national_team' valida/grava SELEÇÕES (T517) em vez de clubes.
      kind: { type: 'string', default: 'club' },
    },
  });
  const APPLY_ON = values.apply || process.argv.includes('--apply');
  const wave = values.wave ?? 'all';
  const kind = values.kind === 'national_team' ? 'national_team' : 'club';
  const targets =
    wave === 't512'
      ? TARGET_CLUBS
      : wave === 't513'
        ? TARGET_CLUBS_T513
        : wave === 't517'
          ? TARGET_NATIONS_T517
          : wave === 't516'
            ? TARGET_CLUBS_T516
            : wave === 't515'
              ? TARGET_CLUBS_T515
              : wave === 't514'
                ? TARGET_CLUBS_T514
                : ALL_TARGET_CLUBS;
  const prisma = new PrismaClient();
  try {
    // --- 1) alvos → QIDs (derivados do artigo, ou explícitos) ---
    let pairs: Array<{ qid: string; note: string; article?: string }>;
    if (values.qid) {
      pairs = values.qid.split(',').map((q) => ({ qid: q.trim(), note: 'qid explícito' }));
    } else {
      const map = await resolveArticleQids(targets);
      pairs = [];
      for (const t of targets) {
        const qid = map.get(`${t.lang}|${t.article}`);
        if (!qid) {
          console.log(`  ✗ não resolvi QID para ${t.lang}:${t.article} — pulado.`);
          continue;
        }
        pairs.push({ qid, note: t.note, article: `${t.lang}:${t.article}` });
      }
    }
    console.log(
      `[t512/t513] onda=${wave} · alvos=${pairs.length} · modo=${APPLY_ON ? 'APPLY' : 'DRY-RUN'} · QIDs derivados`,
    );

    // --- 2) entidades + validação de "clube de futebol" ---
    const ents = await fetchEntities(pairs.map((p) => p.qid));
    const valid: Array<{ qid: string; note: string; article?: string; entity: Entity }> = [];
    for (const p of pairs) {
      const e = ents[p.qid];
      if (!e || e.missing) {
        console.log(`  ✗ ${p.qid} (${p.article ?? '—'}): não existe no Wikidata.`);
        continue;
      }
      const countryQid = claimIds(e, 'P17')[0];
      // --kind=national_team valida SELEÇÕES (T517): P641=futebol + P17 país e
      // NÃO ser clube de futebol. O P31 das seleções varia demais para exigir
      // uma classe específica (a sub-23 do Brasil não tem Q6979593).
      const okEntity = kind === 'national_team' ? isNationalTeamEntity(e) : isFootballClubEntity(e);
      // O país é exigido para CLUBE; a regra de seleção já aceita classe sem P17.
      if (!okEntity || (kind !== 'national_team' && !countryQid)) {
        console.log(
          `  ✗ ${p.qid} "${pickName(e) ?? '?'}": não é ${
            kind === 'national_team' ? 'seleção' : 'clube'
          } de futebol com país — RECUSADO.`,
        );
        continue;
      }
      valid.push({ ...p, entity: e });
    }

    // --- 3) país → ISO e estádio ---
    const countryIso = await resolveCountryIso([
      ...new Set(valid.map((v) => claimIds(v.entity, 'P17')[0]).filter(Boolean)),
    ]);
    const venues = await resolveVenues([
      ...new Set(valid.flatMap((v) => claimIds(v.entity, PROP_HOME_VENUE))),
    ]);

    // --- 4) dedup + diff (nunca cria duplicata) ---
    let created = 0;
    let attached = 0;
    let skipped = 0;
    for (const v of valid) {
      const iso = countryIso.get(claimIds(v.entity, 'P17')[0]) || null;
      const name = pickName(v.entity, iso);
      const foundedYear = foundedYearOf(v.entity);
      const picked = pickVenue(v.entity, venues);
      const venueName = picked ? pickName(picked.venue.entity, iso) : null;
      const logoFile = claimString(v.entity, 'P154');

      const existing = await prisma.club.findFirst({
        where: { qid: v.qid },
        select: { id: true, name: true, deletedAt: true },
      });
      if (existing) {
        console.log(
          `  = ${v.qid} "${existing.name}": já existe${existing.deletedAt ? ' (SOFT-DELETED)' : ''} — nada a fazer.`,
        );
        skipped += 1;
        continue;
      }

      const label =
        `${v.qid} "${name}" · ${iso ?? '?'} · fund=${foundedYear ?? '?'}` +
        ` · estádio=${venueName ?? '?'}${picked?.venue.capacity ? ` (${picked.venue.capacity})` : ''} · ${v.note}`;

      // mesmo nome e sem QID → ANEXA (evita duplicata)
      const sameName = name
        ? await prisma.club.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null, qid: null },
            select: { id: true, name: true },
          })
        : null;
      if (sameName) {
        console.log(`  ↗ ${label} → ANEXA qid a "${sameName.name}" (${sameName.id})`);
        if (APPLY_ON) {
          await prisma.club.update({
            where: { id: sameName.id },
            data: {
              qid: v.qid,
              ...(iso ? { country: iso } : {}), // preenche só o que está nulo
              ...(foundedYear ? { foundedYear } : {}),
              ...(venueName ? { stadiumName: venueName } : {}),
            },
          });
        }
        attached += 1;
        continue;
      }

      console.log(`  + ${label}${logoFile ? ` · logo=${logoFile}` : ''}`);
      if (APPLY_ON) {
        await prisma.club.create({
          data: {
            name: name ?? v.qid,
            country: iso,
            foundedYear,
            qid: v.qid,
            gender: kind === 'national_team' ? nationalTeamGender(v.entity) : 'men',
            kind,
            logoUrl: logoFile ? commonsFilePath(logoFile) : null,
            stadiumName: venueName,
            stadiumCapacity: picked?.venue.capacity ?? null,
            stadiumImage: picked?.venue.image ?? null,
            importedFrom: 'wikidata-t512',
            importedAt: new Date(),
            sourceUrl: `https://www.wikidata.org/wiki/${v.qid}`,
          },
        });
      }
      created += 1;
    }

    console.log(
      `[t512] fim: ${APPLY_ON ? 'criados' : 'criaria'}=${created} · anexaria=${attached} · já-existiam=${skipped}`,
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('seed-clubs-by-qid')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error(
        { err: String(err).slice(0, 200) },
        '[t512] falha na ingestão de clubes por QID',
      );
      process.exit(1);
    });
}
