import { createWorker } from '../../api/src/services/queue.js';

createWorker('email', async (job) => {
  console.log(`[Email] Sending ${job.name} to:`, job.data.to);
  // TODO: integrate with email provider (Resend/SendGrid)
});

console.log('🚀 Worker Email iniciado. Aguardando jobs...');
