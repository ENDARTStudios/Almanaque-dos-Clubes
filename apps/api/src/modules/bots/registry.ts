/**
 * T603 — SISTEMA DE BOTS: REGISTRO.
 *
 * ── O QUE MUDA EM RELAÇÃO AO QUE JÁ EXISTIA ──────────────────────────────────────
 * O acervo já tinha bons ingestores (um script por domínio) e um bot contínuo de
 * enriquecimento (T575). O que faltava era o SISTEMA: um lugar que responda, para
 * qualquer domínio, "existe bot? quando rodou? funcionou? quanto dado ele trouxe?"
 * — e que permita disparar sem depender de alguém abrir um chat.
 *
 * Cada bot declara:
 *   - `domain`    — competição, clubes, jogadores, rankings, mapas, partidas, lendas,
 *                   catálogo/metadados, mídia;
 *   - `script`    — o ingest/enricher já testado (nada de scraper novo aqui);
 *   - `cadenceHours` — quando vence a próxima rodada;
 *   - `metric`    — a expressão SQL que PROVA que o bot mexeu no acervo. É o
 *                   antídoto do "DONE sem dado": a rodada registra antes/depois;
 *   - `sources`   — chaves do `source-registry` (licença/atribuição verificadas);
 *   - `writes`    — true só quando o bot grava (dry-run por padrão nos scripts).
 *
 * Bot novo = uma entrada aqui. Nada de cron novo por domínio.
 */

export type BotDomain =
  | 'competicoes'
  | 'clubes'
  | 'jogadores'
  | 'rankings'
  | 'mapas'
  | 'partidas'
  | 'lendas'
  | 'catalogo'
  | 'midia';

export interface BotDefinition {
  key: string;
  domain: BotDomain;
  label: string;
  /** Script em `dist/scripts/` (o mesmo que o operador rodaria à mão). */
  script: string;
  /** Argumentos fixos. `--apply` é acrescentado quando `writes` e a rodada é aplicada. */
  args: string[];
  /** Intervalo mínimo entre rodadas, em horas. */
  cadenceHours: number;
  /** Fontes externas (chaves do source-registry) — auditável e com licença. */
  sources: string[];
  /** Grava no banco? (false = só leitura/relatório). */
  writes: boolean;
  /** SQL que devolve UM número para medir a rodada (antes × depois). */
  metric: string;
  /** Por que este bot existe / o que ele NÃO resolve. */
  note?: string;
}

/** Métricas reutilizadas (evitam divergência de definição entre bots). */
const M = {
  clubLogo: `SELECT count(*)::bigint FROM clubs WHERE "deletedAt" IS NULL AND "logoUrl" IS NOT NULL`,
  clubCrest: `SELECT count(*)::bigint FROM club_crests WHERE "isCurrent"`,
  clubCoords: `SELECT count(*)::bigint FROM clubs WHERE "deletedAt" IS NULL AND latitude IS NOT NULL`,
  clubEditorial: `SELECT count(*)::bigint FROM clubs WHERE "deletedAt" IS NULL AND "editorialText" IS NOT NULL`,
  clubKits: `SELECT count(*)::bigint FROM clubs WHERE "deletedAt" IS NULL AND "kitHistory" IS NOT NULL`,
  clubStates: `SELECT count(*)::bigint FROM clubs WHERE "deletedAt" IS NULL AND "stateId" IS NOT NULL`,
  playerPhoto: `SELECT count(*)::bigint FROM players WHERE "photoUrl" IS NOT NULL`,
  playerProfile: `SELECT count(*)::bigint FROM players WHERE position IS NOT NULL`,
  playerClub: `SELECT count(*)::bigint FROM players WHERE "clubId" IS NOT NULL`,
  matches: `SELECT count(*)::bigint FROM matches`,
  matchScorers: `SELECT count(*)::bigint FROM matches WHERE scorers IS NOT NULL`,
  rankings: `SELECT count(*)::bigint FROM rankings`,
  playerRanking: `SELECT count(*)::bigint FROM ranking_entries WHERE "playerId" IS NOT NULL`,
  compQid: `SELECT count(*)::bigint FROM competitions WHERE "deletedAt" IS NULL AND qid IS NOT NULL`,
  cities: `SELECT count(*)::bigint FROM cities`,
  countries: `SELECT count(*)::bigint FROM countries`,
} as const;

/**
 * Registro. ORDEM = prioridade de execução quando vários bots vencem juntos.
 * Os scripts já existem e são idempotentes (cursor + zero overwrite).
 */
export const BOTS: readonly BotDefinition[] = [
  // ── Partidas (o maior gap e o que alimenta ranking de jogador) ──────────────
  {
    key: 'matches-rsssf',
    domain: 'partidas',
    label: 'Partidas e resultados (RSSSF)',
    script: 'ingest-backlog.js',
    args: ['--plan', '--run', '--limit=3'],
    cadenceHours: 24,
    sources: ['rsssf'],
    writes: true,
    metric: M.matches,
    note: 'Consome a fila ingest_backlog. DONE = fonte respondeu; a métrica prova se veio dado.',
  },

  // ── Clubes ─────────────────────────────────────────────────────────────────
  {
    key: 'clubs-crests',
    domain: 'clubes',
    label: 'Escudos dos clubes (Wikidata P18 + Commons)',
    script: 'enrich-club-crests-p18.js',
    args: ['--limit=400'],
    cadenceHours: 48,
    sources: ['wikidata', 'commons'],
    writes: true,
    metric: M.clubCrest,
    note: '92% dos clubes sem escudo não têm P18 utilizável — lacuna declarada, não bug.',
  },
  {
    key: 'clubs-coords',
    domain: 'mapas',
    label: 'Coordenadas e localização (Wikidata P625/P131/P115)',
    script: 'enrich-clubs-geo-wikidata.js',
    args: [],
    cadenceHours: 48,
    sources: ['wikidata'],
    writes: true,
    metric: M.clubCoords,
  },
  {
    key: 'clubs-states',
    domain: 'mapas',
    label: 'Estado/UF dos clubes',
    script: 'fill-club-states.js',
    args: [],
    cadenceHours: 168,
    sources: ['wikidata'],
    writes: true,
    metric: M.clubStates,
  },
  {
    key: 'clubs-media',
    domain: 'clubes',
    label: 'Logo, estádio e cores do clube',
    script: 'enrich-clubs-media.js',
    args: ['--limit=500'],
    cadenceHours: 24,
    sources: ['wikidata'],
    writes: true,
    metric: M.clubLogo,
  },
  {
    key: 'clubs-editorial',
    domain: 'clubes',
    label: 'Texto editorial (Wikipédia, com atribuição)',
    script: 'enrich-clubs-editorial.js',
    args: ['--limit=500'],
    cadenceHours: 24,
    sources: ['wikipedia'],
    writes: true,
    metric: M.clubEditorial,
  },
  {
    key: 'clubs-kits',
    domain: 'midia',
    label: 'Uniformes, hino, flâmula e mídia do clube (Commons)',
    script: 'enrich-all-media.js',
    args: ['--batch=500'],
    cadenceHours: 24,
    sources: ['commons'],
    writes: true,
    metric: M.clubKits,
  },

  // ── Jogadores ──────────────────────────────────────────────────────────────
  {
    key: 'players-media',
    domain: 'jogadores',
    label: 'Foto do jogador (Commons/Wikidata)',
    script: 'enrich-players-media.js',
    args: ['--limit=2000'],
    cadenceHours: 24,
    sources: ['commons', 'wikidata'],
    writes: true,
    metric: M.playerPhoto,
  },
  {
    key: 'players-profile',
    domain: 'jogadores',
    label: 'Perfil do jogador (posição, altura, pé, prêmios)',
    script: 'enrich-player-profiles.js',
    args: ['--limit=1000'],
    cadenceHours: 24,
    sources: ['wikidata'],
    writes: true,
    metric: M.playerProfile,
  },
  {
    key: 'players-club',
    domain: 'jogadores',
    label: 'Clube atual por elenco (P54/PLAYED_FOR, janela 2 anos)',
    script: 'derive-players-club-from-squad.js',
    args: ['--limit=300'],
    cadenceHours: 48,
    sources: ['wikidata'],
    writes: true,
    metric: M.playerClub,
  },

  // ── Rankings ───────────────────────────────────────────────────────────────
  {
    key: 'rankings-club',
    domain: 'rankings',
    label: 'Ranking 0-100 de clubes por temporada',
    script: 'calculate-rankings.js',
    args: ['--year=2025'],
    cadenceHours: 24,
    sources: ['wikidata', 'rsssf'],
    writes: true,
    metric: M.rankings,
  },
  {
    key: 'rankings-player',
    domain: 'rankings',
    label: 'Ranking de jogador (artilheiros por temporada)',
    script: 'calculate-rankings.js',
    args: ['--year=2023', '--type=player'],
    cadenceHours: 48,
    sources: ['rsssf'],
    writes: true,
    metric: M.playerRanking,
    note: 'Depende de matches.scorers. Onde a fonte publica "Top scorers" por temporada, o parser certo é outro (ver META-DADOS-COMPLETOS §6).',
  },

  // ── Competições e catálogo ─────────────────────────────────────────────────
  {
    key: 'competitions-qid',
    domain: 'competicoes',
    label: 'QID das competições (identidade estável)',
    script: 'enrich-competitions-qid.js',
    args: [],
    cadenceHours: 168,
    sources: ['wikidata'],
    writes: true,
    metric: M.compQid,
  },
  {
    key: 'countries',
    domain: 'catalogo',
    label: 'Tabela de países (ISO, continente, coordenada)',
    script: 'seed-missing-countries.js',
    args: [],
    cadenceHours: 336,
    sources: ['wikidata'],
    writes: true,
    metric: M.countries,
  },
  {
    key: 'cities',
    domain: 'mapas',
    label: 'Cidades (mapa país → estado → cidade)',
    script: 'ingest-states-wikidata.js',
    args: [],
    cadenceHours: 336,
    sources: ['wikidata'],
    writes: true,
    metric: M.cities,
  },

  // ── Lendas / imortais (DERIVADO: não há ingestão, há recomputação) ─────────
  {
    key: 'legends-rebuild',
    domain: 'lendas',
    label: 'Hall da fama — recomputa e invalida cache',
    script: 'legends-rebuild.js',
    args: [],
    cadenceHours: 24,
    sources: [], // derivado de WON + partidas já no acervo
    writes: false,
    metric: `SELECT count(*)::bigint FROM knowledge_graph WHERE relation = 'WON'`,
    note: 'Lendas/imortais são DERIVADAS (WON + recordes de partida); o bot só recalcula o cache. Não existe fonte externa de "imortal".',
  },
] as const;

export function getBot(key: string): BotDefinition | undefined {
  return BOTS.find((b) => b.key === key);
}

export function botsByDomain(): Record<BotDomain, BotDefinition[]> {
  const out = {} as Record<BotDomain, BotDefinition[]>;
  for (const bot of BOTS) {
    out[bot.domain] = [...(out[bot.domain] ?? []), bot];
  }
  return out;
}
