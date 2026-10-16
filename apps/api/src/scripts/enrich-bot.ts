/**
 * T575 — BOT DE ENRIQUECIMENTO CONTÍNUO (serviço próprio; mesmo image do `media-worker`).
 *
 * Por que existe: os lotes de enriquecimento rodam UMA vez por dia (cron 04:00-07:00 UTC)
 * e cada um cobre uma fila. Fila que roda uma vez por noite leva meses para fechar um
 * acervo de 12 k clubes + 105 k jogadores — e, pior, cada lote novo precisou de um cron
 * novo. Este processo roda em VOLTAS contínuas e cobre TODAS as filas de fonte aberta em
 * rodízio, escolhendo a cada volta a fila de menor progresso relativo.
 *
 * O que ele NÃO faz (limites honestos do acervo):
 *  - não inventa dado: onde a fonte não tem (escudo, cor, foto, clube atual), o cursor
 *    carimba `no_source` e o gap fica DECLARADO;
 *  - não cria fonte nova: usa só Wikidata/Wikipédia/Commons (as fontes já autorizadas);
 *  - não sobrescreve: todo caminho de escrita é "só se estiver NULL".
 *
 * Regras de operação (todas obrigatórias):
 *  - **desligado por padrão**: `ENRICH_BOT_ENABLED` precisa ser verdadeiro para o modo que
 *    GRAVA. Em dry-run ele roda mesmo com a flag desligada — dry-run não escreve nada;
 *  - **dry-run é o default**: sem `--apply`/`ENRICH_BOT_APPLY` o bot só percorre e loga;
 *  - **teto por volta** (`ENRICH_BOT_CAP`, default 40) e **pausa entre voltas**
 *    (`ENRICH_BOT_PAUSE_MS`, default 30 s): a fonte é limitada por taxa (IP de datacenter
 *    do Railway) e o teto de leitura de artigo é 60 por run (`INFOBOX_MAX_POR_RUN`);
 *  - **shutdown gracioso**: SIGTERM/SIGINT terminam a VOLTA CORRENTE e saem (o container
 *    do Railway manda SIGTERM a cada deploy; um lote abortado no meio deixa escrita
 *    parcial e carimbo sem correspondência).
 *
 * Uso:
 *   node dist/scripts/enrich-bot.js --dry-run --max-turns=2   # inspeção sem escrever
 *   ENRICH_BOT_ENABLED=1 ENRICH_BOT_APPLY=1 node dist/scripts/enrich-bot.js
 */
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import {
  bloqueioDeExecucao,
  readBotConfig,
  type EnrichBotConfig,
} from '../modules/etl/enrich-bot-router.js';
import {
  runEnrichBotSession,
  type BotLogEntry,
  type EnrichBotSessionSummary,
} from '../modules/etl/enrich-bot.service.js';
import { buildEnrichQueueAdapters } from '../modules/etl/enrich-bot-queues.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Log estruturado do pino. NUNCA recebe nome/QID de entidade — só contagem e fila. */
function logEstruturado(entry: BotLogEntry): void {
  const msg = `enrich-bot: ${entry.event}`;
  if (entry.level === 'error') logger.error(entry.data, msg);
  else if (entry.level === 'warn') logger.warn(entry.data, msg);
  else logger.info(entry.data, msg);
}

async function main(): Promise<number> {
  const config: EnrichBotConfig = readBotConfig();

  const bloqueio = bloqueioDeExecucao(config);
  if (bloqueio) {
    logger.info({ dryRun: !config.apply, cap: config.cap }, `enrich-bot: ${bloqueio}`);
    return 0;
  }
  if (!config.apply && !config.enabled) {
    // Dry-run com a flag desligada é permitido (não escreve) — mas fica registrado, porque
    // quem lê o log precisa saber POR QUE o bot rodou sem a flag.
    logger.info(
      { enabled: false, apply: false },
      'enrich-bot: ENRICH_BOT_ENABLED=false e sem --apply — rodando em DRY-RUN (nada é gravado)',
    );
  }

  let parando = false;
  let sinalRecebido: string | null = null;
  const pedirParada = (sinal: string) => {
    if (parando) {
      logger.warn({ sinal }, 'enrich-bot: segundo sinal — encerrando imediatamente');
      process.exit(130);
    }
    parando = true;
    sinalRecebido = sinal;
    logger.info(
      { sinal },
      'enrich-bot: sinal recebido — termina a volta corrente e sai (sem iniciar outra)',
    );
  };
  process.on('SIGTERM', () => pedirParada('SIGTERM'));
  process.on('SIGINT', () => pedirParada('SIGINT'));

  const adapters = buildEnrichQueueAdapters(prisma, { refreshDays: config.refreshDays });
  logger.info(
    {
      apply: config.apply,
      cap: config.cap,
      pauseMs: config.pauseMs,
      maxTurns: config.maxTurns,
      refreshDays: config.refreshDays,
      queues: adapters.map((a) => a.id),
    },
    'enrich-bot: sessão iniciando',
  );

  let resumo: EnrichBotSessionSummary;
  try {
    resumo = await runEnrichBotSession({
      adapters,
      config,
      log: logEstruturado,
      sleep,
      shouldStop: () => parando,
    });
  } finally {
    await prisma.$disconnect();
  }

  logger.info(
    {
      sinal: sinalRecebido,
      apply: config.apply,
      turns: resumo.turns,
      idleTurns: resumo.idleTurns,
      progressedTurns: resumo.progressedTurns,
      erroredTurns: resumo.erroredTurns,
      processed: resumo.processed,
      updated: resumo.updated,
      gaps: resumo.gaps,
      failures: resumo.failures,
      byQueue: resumo.byQueue,
    },
    'enrich-bot: sessão encerrada',
  );
  return 0;
}

// Mesmo guarda do `media-worker.ts`: importar este módulo (teste) não dispara a sessão.
if (process.argv[1]?.includes('enrich-bot')) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      logger.error({ err: String(err).slice(0, 300) }, 'enrich-bot: falha fatal');
      process.exit(1);
    });
}
