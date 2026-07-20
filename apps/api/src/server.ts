/**
 * Ponto de entrada do servidor.
 */
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

async function main() {
  const app = await buildApp();

  try {
    // Teste de conexão com o banco
    await prisma.$connect();
    logger.info('✅ Conectado ao banco de dados');

    await app.listen({ port: env.port, host: env.host });
    logger.info(`🚀 Servidor ouvindo em http://${env.host}:${env.port}/api/v1`);
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
