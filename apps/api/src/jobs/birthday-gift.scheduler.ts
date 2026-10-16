/**
 * WS-C-15 — scheduler do presente de aniversário (fila `gamification`).
 *
 * Cron diário 06:00 UTC: concede 1 mês de Elite para aniversariantes do dia,
 * enfileira email (worker Resend) e cria notificação in-app.
 *
 * Flag: BIRTHDAY_GIFT_ENABLED (default OFF — padrão T451/T342 de flags de
 * scheduler; ativação em produção = variável no Railway). O job em si é
 * idempotente por ano (guard birthdayGiftLastYear).
 */
import { createWorker, queues } from '../services/queue.js';
import { grantBirthdayGifts } from '../modules/billing/birthday-gift.service.js';
import { envFlag } from '../config/flags.js';
import { logger } from '../config/logger.js';

export const GAMIFICATION_QUEUE = 'gamification';
export const BIRTHDAY_JOB_NAME = 'birthday-grant';
export const BIRTHDAY_CRON_PATTERN = '0 6 * * *';

let registered = false;

// O gift é público e independente do tracking (que segue desativado até WS-L).
export function isBirthdayGiftEnabled(): boolean {
  // T568 — mesmo parser do boot (server.ts). Antes: o boot aceitava '1' e este gate
  // exigia 'true' -> com '1' o job rodava e nao concedia nada (falha silenciosa).
  return envFlag('BIRTHDAY_GIFT_ENABLED');
}

export async function birthdayGiftJobHandler(): Promise<void> {
  if (!isBirthdayGiftEnabled()) {
    logger.info('[Birthday Gift] BIRTHDAY_GIFT_ENABLED=false — skip');
    return;
  }
  const res = await grantBirthdayGifts({}, new Date());
  logger.info(
    { granted: res.granted, extended: res.extended, skipped: res.skipped },
    '[Birthday Gift] concessões do dia',
  );
}

/** Registra worker + cron. Idempotente por processo. Chamado no boot da API. */
export async function registerBirthdayGiftCron(): Promise<void> {
  if (registered) return;
  registered = true;
  createWorker(GAMIFICATION_QUEUE, async (job) => {
    if (job.name === BIRTHDAY_JOB_NAME) await birthdayGiftJobHandler();
  });

  await queues.gamification.upsertJobScheduler('birthday-grant-daily', {
    pattern: BIRTHDAY_CRON_PATTERN,
  });
  logger.info({ cron: BIRTHDAY_CRON_PATTERN }, 'Birthday gift scheduler agendado (UTC)');
}

// Fallback worker dedicado (mesmo padrão do ranking-cron T425)
if (process.env.NODE_ENV !== 'test' && process.env.BIRTHDAY_GIFT_WORKER_AUTO === '1') {
  void registerBirthdayGiftCron();
}

void queues;
