import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { envFlag } from '../../config/flags.js';
import { env } from '../../config/env.js';
import { queues } from '../../services/queue.js';
import { isSchedulerEnabled } from '../../jobs/data-refresh.scheduler.js';
import { isBirthdayGiftEnabled } from '../../jobs/birthday-gift.scheduler.js';
import { orchestrationEnabled } from '../../lib/orchestration/flags.js';

/**
 * T-ADMIN-W3 — DIAGNÓSTICO do operador (/admin/diagnostics).
 *
 * O que esta rota entrega: o INVENTÁRIO DE FEATURE FLAGS do projeto com o valor
 * EFETIVO lido no momento da requisição, de onde ele vem e o que é preciso para
 * mudá-lo; e a PRÓXIMA EXECUÇÃO de cada job agendado (BullMQ job schedulers).
 *
 * HONESTIDADE (regra desta entrega)
 *   1. Não existe override persistido de flag em lugar nenhum do projeto. As flags
 *      são variáveis de ambiente lidas no processo — estáticas por processo e
 *      fixadas no boot do container. Esta rota NÃO aceita escrita: nenhum
 *      `POST`/`PATCH` de flag existe aqui, e a página declara na tela que mudar
 *      uma flag exige alterar a variável no provedor e redeployar. Um botão de
 *      "alternar" que só mutasse memória mentiria na tela e morreria no próximo
 *      redeploy — por isso não existe.
 *   2. `value` é sempre o resultado da MESMA expressão que o código de produção
 *      usa (`=== 'true'`, `=== '1'`, `!== '0'`, …), e `source` aponta o arquivo
 *      onde essa leitura acontece. Onde o MESMO nome de variável é lido com
 *      comparadores diferentes, o campo `drift` denuncia a divergência — é
 *      exatamente o tipo de defeito que esta página existe para tornar visível.
 *   3. Flags de OUTRO processo (web/Vercel, worker dedicado) voltam com
 *      `value: null` e `unavailableReason` preenchido: a API não enxerga o
 *      ambiente de outro serviço, e inventar um valor ali seria mentira. Quem
 *      preenche esses valores é a própria página web, lendo o seu processo.
 *   4. `schedulers` consulta o Redis (BullMQ). Redis inalcançável NÃO pendura a
 *      resposta: teto de 2,5 s e o erro real volta em `schedulers.error` com a
 *      lista vazia — a página mostra a lacuna em vez de um número inventado.
 *
 * Custo: o painel faz 1 requisição aqui + as rotas de observabilidade que já
 * existem (/jobs/health para o último resultado de cada job). Nenhum endpoint de
 * saúde foi duplicado.
 */

const STARTED_AT = Date.now();

/** Teto de espera do Redis (ioredis com maxRetriesPerRequest:null tenta para sempre). */
const REDIS_TIMEOUT_MS = 2500;

function withRedisTimeout<T>(p: Promise<T>, ms = REDIS_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`redis timeout ${ms}ms`)), ms)),
  ]);
}

/**
 * Dono do valor. `api` = este processo (Railway); `web` = Next.js (Vercel);
 * `worker` = serviço dedicado (mesma imagem, entrypoint próprio).
 */
export type FlagOwner = 'api' | 'web' | 'worker';

export interface DiagnosticFlagView {
  /** Nome da variável de ambiente. */
  key: string;
  owner: FlagOwner;
  /** `env` = variável lida direto; `derived` = booleano calculado a partir de outras variáveis. */
  kind: 'env' | 'derived';
  /** Agrupador de superfície (billing, e-mail, filas, ingestão, segurança, UI). */
  scope: string;
  /** O que LIGADO significa, em uma frase. */
  effectOn: string;
  /** O que DESLIGADO significa. */
  effectOff: string;
  defaultOn: boolean;
  /** Como mudar o valor (não há override em runtime). */
  change: string;
  /** Arquivo onde a leitura efetiva acontece. */
  source: string;
  /** Leitura divergente da MESMA variável em outro ponto do código (defeito real). */
  drift: string | null;
  /** Valor efetivo AGORA neste processo. `null` quando a flag é de outro processo. */
  value: boolean | null;
  /** Valor bruto da variável (sem transformação). `null` quando ausente/não aplicável. */
  raw: string | null;
  /** Por que `value` é `null` (preenchido só quando é). */
  unavailableReason: string | null;
}

interface ApiFlagDef {
  key: string;
  /** `derived` = booleano calculado a partir de outras variáveis (o default é `env`). */
  kind?: 'derived';
  scope: string;
  effectOn: string;
  effectOff: string;
  defaultOn: boolean;
  change: string;
  source: string;
  /** Leitura divergente da mesma variável em outro ponto do código (ou `null`). */
  drift?: string | null;
  read: () => boolean;
  raw: () => string | null;
}

interface ForeignFlagDef {
  key: string;
  owner: Exclude<FlagOwner, 'api'>;
  scope: string;
  effectOn: string;
  effectOff: string;
  defaultOn: boolean;
  change: string;
  source: string;
  unavailableReason: string;
}

/** Instrução padrão: não existe override em runtime — a flag vive no ambiente do serviço. */
const CHANGE_RAILWAY =
  'Alterar a variável no Railway (serviço da API) e redeployar: o valor é lido no boot e vale ' +
  'para o processo inteiro. Não existe override em runtime.';
const CHANGE_VERCEL =
  'Alterar a variável no Vercel (projeto web) e redeployar. Não existe override em runtime.';

/**
 * Flags lidas NESTE processo. A expressão de `read` é copiada da produção de
 * propósito: se o código mudar, o teste `admin-diagnostics.test.ts` (que afirma
 * `value` para um `process.env` conhecido) passa a falhar — a divergência aparece.
 */
const API_FLAGS: ApiFlagDef[] = [
  {
    key: 'PAYMENTS_ENABLED',
    scope: 'billing',
    effectOn: 'O checkout do provedor (Stripe) está habilitado na API.',
    effectOff: 'Rotas de cobrança desabilitadas (o checkout responde 404/sem provedor).',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/modules/billing/routes.ts:147',
    read: () => process.env.PAYMENTS_ENABLED === 'true',
    raw: () => process.env.PAYMENTS_ENABLED ?? null,
  },
  {
    key: 'BIRTHDAY_GIFT_ENABLED',
    scope: 'e-mail',
    effectOn: 'O cron diário concede 1 mês de Elite aos aniversariantes do dia.',
    effectOff: 'O job roda mas se auto-desliga (skip no handler).',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/jobs/birthday-gift.scheduler.ts:23',
    read: () => isBirthdayGiftEnabled(),
    raw: () => process.env.BIRTHDAY_GIFT_ENABLED ?? null,
  },
  {
    key: 'ETL_SCHEDULER_ENABLED',
    scope: 'ingestão',
    effectOn: 'O worker e as agendas de ETL (data-refresh, mídia) sobem junto com a API.',
    effectOff: 'Nenhum scheduler de ETL roda nesta instância (default OFF).',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/jobs/data-refresh.scheduler.ts:56',
    read: () => isSchedulerEnabled(),
    raw: () => process.env.ETL_SCHEDULER_ENABLED ?? null,
  },
  {
    key: 'WIKIDATA_DRY_RUN',
    scope: 'ingestão',
    effectOn: 'DRY-RUN ligado (default): o job incremental LÊ o Wikidata e não escreve no acervo.',
    effectOff: 'WIKIDATA_DRY_RUN=false habilita a ESCRITA no acervo pelo job incremental.',
    defaultOn: true,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/jobs/wikidata-incremental.ts:211',
    read: () => (process.env.WIKIDATA_DRY_RUN ?? 'true') !== 'false',
    raw: () => process.env.WIKIDATA_DRY_RUN ?? null,
  },
  {
    key: 'MEDIA_WORKER_LOCAL',
    scope: 'filas',
    effectOn:
      'A fila media-enrich é consumida PELA PRÓPRIA API (migração sem janela, comportamento ' +
      'histórico).',
    effectOff:
      'MEDIA_WORKER_LOCAL=0: a API não consome a fila; quem consome é o serviço media-worker.',
    defaultOn: true,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/jobs/data-refresh.scheduler.ts:384',
    read: () => envFlag('MEDIA_WORKER_LOCAL', false),
    raw: () => process.env.MEDIA_WORKER_LOCAL ?? null,
  },
  {
    key: 'RANKING_CRON_AUTO',
    scope: 'rankings',
    effectOn: 'O cron do ranking 0-100 é registrado automaticamente no boot.',
    effectOff: 'O ranking só é recalculado por execução manual.',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/server.ts:21',
    drift: null,
    read: () => process.env.RANKING_CRON_AUTO === '1',
    raw: () => process.env.RANKING_CRON_AUTO ?? null,
  },
  {
    key: 'BIRTHDAY_GIFT_WORKER_AUTO',
    scope: 'e-mail',
    effectOn: 'Um processo worker dedicado registra o cron do presente de aniversário.',
    effectOff: 'O cron do presente só existe se a API o registrar no boot.',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/jobs/birthday-gift.scheduler.ts:58',
    drift: null,
    read: () => process.env.BIRTHDAY_GIFT_WORKER_AUTO === '1',
    raw: () => process.env.BIRTHDAY_GIFT_WORKER_AUTO ?? null,
  },
  {
    key: 'ORCHESTRATION_ENABLED',
    scope: 'ingestão',
    effectOn: 'A camada de orquestração de ETL (WS-G-1) está habilitada.',
    effectOff: 'Orquestração desligada (default OFF, fail-safe).',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/lib/orchestration/flags.ts:6',
    read: () => orchestrationEnabled(),
    raw: () => process.env.ORCHESTRATION_ENABLED ?? null,
  },
  {
    key: 'USER_TRACKING_ENABLED',
    scope: 'LGPD/telemetria',
    effectOn: 'O dashboard calcula atividade de usuário a partir de telemetria de uso.',
    effectOff:
      'Telemetria de atividade desligada (default) — pendente do consentimento de cookie (WS-L).',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/config/env.ts:167 (schema) e :203 (leitura)',
    drift: null,
    read: () => Boolean(env.userTrackingEnabled),
    raw: () => process.env.USER_TRACKING_ENABLED ?? null,
  },
  {
    key: 'RATE_LIMIT_DISABLED',
    scope: 'segurança',
    effectOn:
      'Rate-limit GLOBAL por IP desligado (escape hatch de teste de carga; NÃO afeta o ' +
      'brute-force de /auth/login, que é por IP+email).',
    effectOff: 'Rate-limit global por IP ativo.',
    defaultOn: false,
    change: CHANGE_RAILWAY,
    source: 'apps/api/src/config/env.ts:154 (schema) e :203 (leitura)',
    read: () => Boolean(env.rateLimitDisabled),
    raw: () => process.env.RATE_LIMIT_DISABLED ?? null,
  },
  {
    key: 'GOOGLE_LOGIN_ENABLED',
    kind: 'derived',
    scope: 'identidade',
    effectOn: 'Login social Google disponível (client id + secret presentes).',
    effectOff: 'Provedor Google ausente: a rota responde 404 (não é erro de configuração).',
    defaultOn: false,
    change:
      'Definir GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (e GOOGLE_REDIRECT_URI se o domínio ' +
      'público não derivar de RAILWAY_PUBLIC_DOMAIN) no Railway e redeployar.',
    source: 'apps/api/src/config/env.ts:159-163 (derivada de GOOGLE_CLIENT_ID/SECRET)',
    read: () => Boolean(env.googleClientId && env.googleClientSecret),
    raw: () =>
      env.googleClientId && env.googleClientSecret
        ? 'client id + secret presentes'
        : 'client id e/ou secret ausentes',
  },
];

/**
 * Flags de OUTROS processos. Voltam sem valor (`null`) porque a API não lê o
 * ambiente de outro serviço. A página web preenche as de `owner: 'web'` lendo o
 * seu próprio `process.env`; as de `owner: 'worker'` ficam declaradas sem valor.
 */
const FOREIGN_FLAGS: ForeignFlagDef[] = [
  {
    key: 'LEGAL_PAGES_ENABLED',
    owner: 'web',
    scope: 'UI/LGPD',
    effectOn: 'Páginas legais (privacidade, termos, cookies, segurança) publicadas.',
    effectOff: 'As páginas legais respondem 404 (default OFF).',
    defaultOn: false,
    change: CHANGE_VERCEL,
    source: 'apps/web/src/lib/flags.ts:10',
    unavailableReason:
      'Flag do processo WEB (Vercel): a API não lê o ambiente de outro serviço. O valor é ' +
      'mostrado pela própria página, lido no servidor web.',
  },
  {
    key: 'COOKIE_BANNER_ENABLED',
    owner: 'web',
    scope: 'UI/LGPD',
    effectOn: 'Banner de cookies + centro de preferências renderizado no layout.',
    effectOff: 'Sem banner (default OFF).',
    defaultOn: false,
    change: CHANGE_VERCEL,
    source: 'apps/web/src/lib/flags.ts:15',
    unavailableReason:
      'Flag do processo WEB (Vercel): a API não lê o ambiente de outro serviço. O valor é ' +
      'mostrado pela própria página, lido no servidor web.',
  },
  {
    key: 'MEDIA_WORKER_ONCE',
    owner: 'worker',
    scope: 'filas',
    effectOn: 'O serviço media-worker processa o que há na fila e encerra (execução pontual).',
    effectOff: 'O media-worker roda como consumidor contínuo.',
    defaultOn: false,
    change:
      'Não é variável de configuração permanente: passa na linha de comando do serviço ' +
      '(MEDIA_WORKER_ONCE=1 node dist/scripts/media-worker.js).',
    source: 'apps/api/src/scripts/media-worker.ts:48',
    unavailableReason:
      'Lida apenas pelo processo do serviço media-worker — a API não é esse processo e não ' +
      'pode afirmar o valor.',
  },
];

const FEATURE_FLAG_PACKAGE_REPORT = {
  module: 'packages/feature-flags',
  persistence: 'Map em memória, por processo (setFeatureFlag/isFeatureEnabled/resetFeatureFlags)',
  hasPersistedOverride: false,
  consumedByRuntime: false,
  flags: [
    { key: 'export_csv', minimumPlan: 'PRO' },
    { key: 'advanced_search', minimumPlan: 'PRO' },
    { key: 'api_keys', minimumPlan: 'ELITE' },
    { key: 'knowledge_graph', minimumPlan: 'ELITE' },
    { key: 'webhooks', minimumPlan: 'ELITE' },
    { key: 'bulk_import', minimumPlan: 'ADMIN' },
    { key: 'beta_feature_x', minimumPlan: 'FREE' },
  ],
  note:
    'O pacote feature-flags NÃO é consumido por API, web nem worker (só pelos próprios testes) e ' +
    'não tem fonte de override persistida além do Map em memória. Ligar uma flag ali não muda ' +
    'comportamento nenhum e não sobrevive a restart — por isso NÃO há botão de ligar/desligar ' +
    'para elas nesta tela. As flags que de fato governam comportamento são variáveis de ambiente ' +
    '(tabela acima).',
} as const;

export interface AdminDiagnosticsPayload {
  generatedAt: string;
  processes: {
    api: {
      service: 'api';
      nodeEnv: string;
      commit: string | null;
      uptimeSeconds: number;
      startedAt: string;
      schedulerEnabled: boolean;
      redisConfigured: boolean;
    };
  };
  flags: DiagnosticFlagView[];
  featureFlagPackage: typeof FEATURE_FLAG_PACKAGE_REPORT;
  schedulers: {
    error: string | null;
    items: Array<{
      queue: string;
      id: string | null;
      name: string;
      pattern: string | null;
      everyMs: number | null;
      nextRunAt: string | null;
    }>;
  };
  upload: {
    maxBytes: number;
    allowedMimes: string[];
    bucket: string;
    publicUrlConfigured: boolean;
    listingEndpoint: null;
    routes: Array<{ method: 'POST'; path: string; permission: string; folder: string }>;
  };
  notes: string[];
}

/** Agenda de job (BullMQ job scheduler) — shape estrutural, sem depender do tipo do pacote. */
interface SchedulerItem {
  id?: string | null;
  name: string;
  pattern?: string;
  every?: number;
  next?: number;
}

/**
 * Filas que recebem agenda por `upsertJobScheduler`. Acesso EXPLÍCITO por fila (e
 * não `queues[key]`): mantém o tipo e evita indexação dinâmica.
 */
const SCHEDULER_SOURCES: Array<{ queue: string; list: () => Promise<SchedulerItem[]> }> = [
  { queue: 'data-refresh', list: () => queues.dataRefresh.getJobSchedulers() },
  { queue: 'media-enrich', list: () => queues.mediaEnrich.getJobSchedulers() },
  { queue: 'gamification', list: () => queues.gamification.getJobSchedulers() },
  { queue: 'ranking', list: () => queues.ranking.getJobSchedulers() },
];

async function readSchedulers(): Promise<AdminDiagnosticsPayload['schedulers']> {
  try {
    const perQueue = await withRedisTimeout(
      Promise.all(
        SCHEDULER_SOURCES.map(async (source) => {
          const list = await source.list();
          return list.map((s) => ({
            queue: source.queue,
            id: s.id ?? null,
            // `name` pode vir vazio quando o scheduler foi criado sem jobTemplate
            // (caso do birthday-grant): cai no id para a linha não chegar anônima.
            name: s.name || s.id || '(sem nome)',
            pattern: s.pattern ?? null,
            everyMs: s.every ?? null,
            nextRunAt: typeof s.next === 'number' ? new Date(s.next).toISOString() : null,
          }));
        }),
      ),
    );
    const items = perQueue
      .flat()
      .sort((a, b) => (a.nextRunAt ?? '~').localeCompare(b.nextRunAt ?? '~'));
    return { error: null, items };
  } catch (err) {
    // Redis fora do ar (ou agendador nunca registrado neste ambiente): a lacuna é
    // declarada, com a lista VAZIA em vez de números inventados.
    return { error: err instanceof Error ? err.message : String(err), items: [] };
  }
}

export const adminDiagnosticsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/admin/diagnostics',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (_request, reply) => {
      // Anotação em CADA array (e não só no resultado): `concat` é tipado pelo
      // elemento do RECEPTOR, então o array das flags de outro processo precisa do
      // tipo largo antes de ser somado ao array das flags da API.
      const apiFlags: DiagnosticFlagView[] = API_FLAGS.map((def) => ({
        key: def.key,
        owner: 'api',
        kind: def.kind ?? 'env',
        scope: def.scope,
        effectOn: def.effectOn,
        effectOff: def.effectOff,
        defaultOn: def.defaultOn,
        change: def.change,
        source: def.source,
        drift: def.drift ?? null,
        value: def.read(),
        raw: def.raw(),
        unavailableReason: null,
      }));
      const foreignFlags: DiagnosticFlagView[] = FOREIGN_FLAGS.map((def) => ({
        key: def.key,
        owner: def.owner,
        kind: 'env',
        scope: def.scope,
        effectOn: def.effectOn,
        effectOff: def.effectOff,
        defaultOn: def.defaultOn,
        change: def.change,
        source: def.source,
        drift: null,
        value: null,
        raw: null,
        unavailableReason: def.unavailableReason,
      }));
      const flags: DiagnosticFlagView[] = [...apiFlags, ...foreignFlags];

      const schedulers = await readSchedulers();

      const payload: AdminDiagnosticsPayload = {
        generatedAt: new Date().toISOString(),
        processes: {
          api: {
            service: 'api',
            nodeEnv: env.nodeEnv,
            commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
            uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
            startedAt: new Date(STARTED_AT).toISOString(),
            schedulerEnabled: isSchedulerEnabled(),
            redisConfigured: Boolean(
              process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDIS_HOST,
            ),
          },
        },
        flags,
        featureFlagPackage: FEATURE_FLAG_PACKAGE_REPORT,
        schedulers,
        upload: {
          maxBytes: env.uploadMaxBytes,
          allowedMimes: env.uploadAllowedMimes,
          bucket: env.s3Bucket,
          publicUrlConfigured: Boolean(env.s3PublicUrl),
          listingEndpoint: null,
          routes: [
            {
              method: 'POST',
              path: '/api/v1/upload',
              permission: 'clubs:write',
              folder: 'uploads',
            },
            {
              method: 'POST',
              path: '/api/v1/upload/csv',
              permission: 'clubs:manage',
              folder: 'imports',
            },
          ],
        },
        notes: [
          'Nenhuma flag tem override persistido: o valor é variável de ambiente do processo, ' +
            'fixada no boot. Mudar exige alterar a variável no provedor e redeployar.',
          '`value` é lido no momento da requisição e vem da MESMA expressão usada em produção ' +
            '(campo `source`). Flags de outro processo voltam `null` com o motivo declarado.',
          'Fora do inventário de propósito: variáveis de ajuste (BATCH_SIZE, WORKER_MODE), ' +
            'credenciais/segredos e chaves de provedor — não são portões de funcionalidade e ' +
            'não são exibidas para não expor segredo em tela.',
          'A API não expõe listagem de assets enviados: /upload é só escrita ' +
            '(listingEndpoint=null). A página de upload declara essa lacuna.',
        ],
      };

      return reply.send({ data: payload });
    },
  );
};
