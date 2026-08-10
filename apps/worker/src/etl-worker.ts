import { createWorker } from '../../api/src/services/queue.js';

createWorker('etl', async (job) => {
  console.log(`[ETL] Processing ${job.name}:`, job.data);
  // TODO: implement ETL data fetching logic
});

console.log('🚀 Worker ETL iniciado. Aguardando jobs...');
