/**
 * Ponto de entrada do servidor.
 */
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { setupWebSocket } from './services/websocket.js';

async function main() {
  const app = await buildApp();

  try {
    // Teste de conexão com o banco
    await prisma.$connect();
    logger.info('✅ Conectado ao banco de dados');

    // T438 — cron diário do Ranking 0-100 (BullMQ, 03:00 UTC). Opt-in via env
    // (RANKING_CRON_AUTO=1): exige Redis e não deve rodar em testes/múltiplas
    // réplicas sem coordenação.
    if (process.env.RANKING_CRON_AUTO === '1') {
      const { registerRankingCron } = await import('./modules/rankings/ranking-cron.job.js');
      await registerRankingCron();
    }

    await app.listen({ port: env.port, host: env.host });
    setupWebSocket(app);
    logger.info(`🚀 Servidor ouvindo em http://${env.host}:${env.port}/api/v1`);
    logger.info(`   WebSocket disponível em ws://${env.host}:${env.port}/ws`);
    logger.info(`   Ambiente: ${env.nodeEnv}`);
  } catch (err) {
    logger.fatal({ err }, 'Falha ao iniciar servidor');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Recebido sinal de shutdown, encerrando...');
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main();
