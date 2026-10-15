import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { withRlsContext } from '../../config/rls-context.js';
import { cache } from '../../services/cache.js';

/**
 * Painel de MÉTRICAS do admin (/admin/metricas).
 *
 * Um payload único para a página fazer UMA requisição. O trio de autorização é
 * EXATAMENTE o das demais rotas internas (`authenticate` + `requireRole('admin')`
 * + `requireOperator`): logado, com papel admin E na allowlist do operador.
 *
 * HONESTIDADE DOS DADOS
 *   Toda contagem sai de uma consulta real ao banco — nada é estimado nem
 *   inventado. Onde não existe fonte (ver `computeMetrics`), o bloco simplesmente
 *   NÃO é devolvido; a página não preenche a lacuna com placeholder.
 *
 * CACHE
 *   `cache.remember` (60s) usa o helper de Redis do projeto, que já degrada para
 *   o banco quando o Redis está inalcançável (ver `services/cache.ts`). O
 *   `measuredAt` é o instante em que o payload foi COMPUTADO — dentro da janela
 *   de 60s ele fica congelado de propósito, e isso é declarado no campo
 *   `cacheTtlSeconds` para a página não exibir um horário falso de "agora".
 */
const CACHE_KEY = 'admin:metrics:v1';
const CACHE_TTL_SECONDS = 60;

interface ClubCoverageRaw {
  total: number;
  logoUrl: number;
  stadiumName: number;
  teamColors: number;
  editorialText: number;
  kitHistory: number;
  anthem: number;
  pennants: number;
  withoutLatitude: number;
}

/** Fila por chave do cursor `clubs.mediaEnrichment` (job `enrich-all-media`). */
interface FilaRowRaw {
  logo: number;
  stadium: number;
  colors: number;
  editorial: number;
  kits: number;
}

interface PlayerCoverageRaw {
  total: number;
  photoUrl: number;
  country: number;
  position: number;
  clubId: number;
}

interface MonthRowRaw {
  month: string;
  n: number;
}

interface FavoriteRowRaw {
  targetType: string;
  targetId: string;
  n: number;
  clubName: string | null;
}

export interface AdminMetricsPayload {
  measuredAt: string;
  cacheTtlSeconds: number;
  acervo: {
    clubsByKind: Record<string, number>;
    clubsTotal: number;
    players: number;
    matches: number;
    competitions: number;
    seasons: number;
    competitionSeasons: number;
    seasonsWithChampion: number;
    rankings: number;
  };
  cobertura: {
    clubs: ClubCoverageRaw;
    players: PlayerCoverageRaw;
  };
  filaPorChave: Record<string, number>;
  produto: {
    users: { total: number; active: number; withBirthDate: number; giftReceived: number };
    subscriptionsByPlan: Record<string, number>;
  };
  series: {
    usersByMonth: Array<{ month: string; count: number }>;
    catalogByType: Array<{ key: string; count: number }>;
    topFavorites: Array<{
      targetType: string;
      targetId: string;
      name: string | null;
      count: number;
    }>;
  };
}

/** Últimos `n` meses (UTC) no formato `YYYY-MM`, do mais antigo ao mais recente. */
function lastMonths(n: number, now: Date): string[] {
  const out: string[] = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

async function computeMetrics(): Promise<AdminMetricsPayload> {
  return withRlsContext({ role: 'SERVICE' }, async (tx) => {
    // --- Acervo -------------------------------------------------------------
    const kindRows = await tx.club.groupBy({
      by: ['kind'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    // `Object.fromEntries` (e não `obj[chave] = ...`): evita o falso-positivo do
    // `security/detect-object-injection` sem precisar desabilitar a regra.
    const clubsByKind: Record<string, number> = Object.fromEntries(
      kindRows.map((row) => [row.kind, row._count._all] as const),
    );
    const clubsTotal = Object.values(clubsByKind).reduce((a, b) => a + b, 0);

    const [
      players,
      matches,
      competitions,
      seasons,
      competitionSeasons,
      seasonsWithChampion,
      rankings,
    ] = await Promise.all([
      tx.player.count(),
      tx.match.count(),
      tx.competition.count({ where: { deletedAt: null } }),
      tx.season.count(),
      tx.competitionSeason.count(),
      tx.competitionSeason.count({ where: { championId: { not: null } } }),
      tx.ranking.count(),
    ]);

    // --- Cobertura ----------------------------------------------------------
    // SQL cru: os campos JSONB (teamColors/editorialText/kitHistory/anthem/
    // pennants) exigem filtro de nulo que o Prisma expressa mal. Uma passada só,
    // com FILTER, é mais barata que N+1 counts.
    const clubCovRows = await tx.$queryRaw<ClubCoverageRaw[]>`
      SELECT
        (count(*))::int                                                       AS "total",
        (count(*) FILTER (WHERE "logoUrl" IS NOT NULL))::int                  AS "logoUrl",
        (count(*) FILTER (WHERE "stadiumName" IS NOT NULL))::int              AS "stadiumName",
        (count(*) FILTER (WHERE "teamColors" IS NOT NULL))::int               AS "teamColors",
        (count(*) FILTER (WHERE "editorialText" IS NOT NULL))::int            AS "editorialText",
        (count(*) FILTER (WHERE "kitHistory" IS NOT NULL))::int               AS "kitHistory",
        (count(*) FILTER (WHERE "anthem" IS NOT NULL))::int                   AS "anthem",
        (count(*) FILTER (WHERE "pennants" IS NOT NULL))::int                 AS "pennants",
        (count(*) FILTER (WHERE "latitude" IS NULL))::int                     AS "withoutLatitude"
      FROM clubs
      WHERE "deletedAt" IS NULL
    `;
    const clubCov: ClubCoverageRaw = clubCovRows[0] ?? {
      total: 0,
      logoUrl: 0,
      stadiumName: 0,
      teamColors: 0,
      editorialText: 0,
      kitHistory: 0,
      anthem: 0,
      pennants: 0,
      withoutLatitude: 0,
    };

    const playerCovRows = await tx.$queryRaw<PlayerCoverageRaw[]>`
      SELECT
        (count(*))::int                                       AS "total",
        (count(*) FILTER (WHERE "photoUrl" IS NOT NULL))::int AS "photoUrl",
        (count(*) FILTER (WHERE "country" IS NOT NULL))::int  AS "country",
        (count(*) FILTER (WHERE "position" IS NOT NULL))::int AS "position",
        (count(*) FILTER (WHERE "clubId" IS NOT NULL))::int   AS "clubId"
      FROM players
    `;
    const playerCov: PlayerCoverageRaw = playerCovRows[0] ?? {
      total: 0,
      photoUrl: 0,
      country: 0,
      position: 0,
      clubId: 0,
    };

    // --- Fila por chave do cursor ------------------------------------------
    // TRÊS VALORES: `mediaEnrichment` NULL = nunca tentou; o registro existe mas
    // sem a chave = tentou e falhou/ainda não. Sem o `IS NULL`, `NOT (NULL ? 'k')`
    // é NULL e o FILTER NÃO conta — a fila volta subestimada.
    //
    // Colunas escritas por extenso (não montadas por template): cada `${}` num
    // tagged template do Prisma vira PARÂMETRO ($1), o que transformaria o
    // operador `?` num `? $1` inválido e devolveria a contagem errada.
    const filaRows = await tx.$queryRaw<FilaRowRaw[]>`
      SELECT
        (count(*) FILTER (WHERE "mediaEnrichment" IS NULL OR NOT ("mediaEnrichment" ? 'logo')))::int      AS "logo",
        (count(*) FILTER (WHERE "mediaEnrichment" IS NULL OR NOT ("mediaEnrichment" ? 'stadium')))::int   AS "stadium",
        (count(*) FILTER (WHERE "mediaEnrichment" IS NULL OR NOT ("mediaEnrichment" ? 'colors')))::int    AS "colors",
        (count(*) FILTER (WHERE "mediaEnrichment" IS NULL OR NOT ("mediaEnrichment" ? 'editorial')))::int AS "editorial",
        (count(*) FILTER (WHERE "mediaEnrichment" IS NULL OR NOT ("mediaEnrichment" ? 'kits')))::int      AS "kits"
      FROM clubs
      WHERE "deletedAt" IS NULL
    `;
    const fila = filaRows[0];
    const filaEntries: Array<[string, number]> = [
      ['logo', Number(fila?.logo ?? 0)],
      ['stadium', Number(fila?.stadium ?? 0)],
      ['colors', Number(fila?.colors ?? 0)],
      ['editorial', Number(fila?.editorial ?? 0)],
      ['kits', Number(fila?.kits ?? 0)],
    ];
    const filaPorChave: Record<string, number> = Object.fromEntries(filaEntries);

    // --- Produto ------------------------------------------------------------
    const [usersTotal, usersActive, usersWithBirthDate, usersGiftReceived] = await Promise.all([
      tx.user.count({ where: { deletedAt: null } }),
      tx.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      tx.user.count({ where: { deletedAt: null, birthDate: { not: null } } }),
      tx.user.count({ where: { deletedAt: null, birthdayGiftLastYear: { not: null } } }),
    ]);
    const planRows = await tx.subscription.groupBy({ by: ['plan'], _count: { _all: true } });
    const subscriptionsByPlan: Record<string, number> = Object.fromEntries(
      planRows.map((row) => [row.plan, row._count._all] as const),
    );

    // --- Séries -------------------------------------------------------------
    const monthRows = await tx.$queryRaw<MonthRowRaw[]>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS "month",
             (count(*))::int                                     AS "n"
      FROM users
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= date_trunc('month', CURRENT_DATE) - interval '11 months'
      GROUP BY 1
      ORDER BY 1
    `;
    const byMonth = new Map(monthRows.map((r) => [r.month, Number(r.n)]));
    const usersByMonth = lastMonths(12, new Date()).map((month) => ({
      month,
      count: byMonth.get(month) ?? 0,
    }));

    const catalogByType = [
      { key: 'clubs', count: clubsByKind.club ?? 0 },
      { key: 'nationalTeams', count: clubsByKind.national_team ?? 0 },
      { key: 'players', count: players },
      { key: 'matches', count: matches },
      { key: 'competitions', count: competitions },
    ];

    // Top 10 alvos mais favoritados. O nome só existe para alvo de clube (é o
    // único com join barato aqui); para jogador/competição fica NULL — a página
    // mostra o identificador cru em vez de inventar um rótulo.
    const favoriteRows = await tx.$queryRaw<FavoriteRowRaw[]>`
      SELECT f."targetType"          AS "targetType",
             f."targetId"            AS "targetId",
             (count(*))::int         AS "n",
             max(c."name")           AS "clubName"
      FROM favorites f
      LEFT JOIN clubs c ON f."targetType" = 'club' AND c.id = f."targetId"
      WHERE f."deletedAt" IS NULL
      GROUP BY f."targetType", f."targetId"
      ORDER BY "n" DESC, f."targetId" ASC
      LIMIT 10
    `;
    const topFavorites = favoriteRows.map((r) => ({
      targetType: r.targetType,
      targetId: r.targetId,
      name: r.clubName,
      count: Number(r.n),
    }));

    // BLOCOS SEM FONTE REAL (declarados): receita/MRR (a API não expõe valores de
    // billing agregados sem risco de vazar dado financeiro por clique), retenção/
    // churn (não há tabela de eventos de sessão agregada) e DAU/MAU (não há
    // telemetria de visita por usuário). Ficam DE FORA do payload.

    return {
      measuredAt: new Date().toISOString(),
      cacheTtlSeconds: CACHE_TTL_SECONDS,
      acervo: {
        clubsByKind,
        clubsTotal,
        players,
        matches,
        competitions,
        seasons,
        competitionSeasons,
        seasonsWithChampion,
        rankings,
      },
      cobertura: { clubs: clubCov, players: playerCov },
      filaPorChave,
      produto: {
        users: {
          total: usersTotal,
          active: usersActive,
          withBirthDate: usersWithBirthDate,
          giftReceived: usersGiftReceived,
        },
        subscriptionsByPlan,
      },
      series: { usersByMonth, catalogByType, topFavorites },
    };
  });
}

export const adminMetricsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/admin/metrics',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (_request, reply) => {
      const data = await cache.remember(CACHE_KEY, CACHE_TTL_SECONDS, computeMetrics);
      return reply.send({ data });
    },
  );
};
