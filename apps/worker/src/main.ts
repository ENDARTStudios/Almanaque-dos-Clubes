/**
 * Entry do serviço de worker (Railway) — seletor de modo via WORKER_MODE.
 *
 *  - etl (default, back-compat com o CMD anterior do Dockerfile): worker de ETL;
 *  - email: worker da fila `email` (Resend) — welcome/password-reset/
 *    verify-email/birthday-gift;
 *  - idle: NÃO registra consumer nenhum — deploy auditado (fila, envs, logs)
 *    antes de ativar o consumo (T493/despacho email-worker).
 *
 * Modo desconhecido = exit 1 (fail-loud; Railway reinicia e o erro aparece no log).
 *
 * Health shim: o railway.json da raiz é compartilhado pelos serviços sem root
 * próprio e define healthcheckPath=/api/v1/health para todos — este processo
 * responde 200 a qualquer GET (incluindo esse caminho) para o deploy do worker
 * passar pelo mesmo gate da API, sem expor nada (sem dados, sem rotas).
 */
import { createServer } from 'node:http';

const mode = (process.env.WORKER_MODE ?? 'etl').toLowerCase();

function startHealthShim(): void {
  const port = Number(process.env.PORT ?? 8080);
  createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('worker healthy\n');
  }).listen(port, '0.0.0.0', () => {
    console.log(`[Worker] health shim em :${port} (200 para qualquer GET)`);
  });
}

async function main(): Promise<void> {
  startHealthShim();
  if (mode === 'idle') {
    console.log('[Worker] WORKER_MODE=idle — nenhum consumer registrado (audit-only).');
    // Mantém o processo vivo sem consumir (container que sai = restart loop).
    setInterval(() => {}, 1 << 30);
    return;
  }
  if (mode === 'email') {
    await import('./email-worker.js');
    return;
  }
  if (mode === 'etl') {
    await import('./etl-worker.js');
    return;
  }
  console.error(`[Worker] WORKER_MODE desconhecido: "${mode}" (use idle | email | etl)`);
  process.exit(1);
}

void main();
