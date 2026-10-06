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
 */
const mode = (process.env.WORKER_MODE ?? 'etl').toLowerCase();

async function main(): Promise<void> {
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
