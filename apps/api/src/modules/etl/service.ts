import { addJob } from '../../services/queue.js';

export const ETL_SOURCES = [
  'wikidata',
  'rsssf',
  'fbref',
  'football-data',
  'openstreetmap',
  'wikimedia-commons',
  'thesportsdb',
  // T448 — arestas WON (títulos) a partir de edições Wikidata (P1346).
  'wikidata-titles',
  'full-sync',
] as const;
export type ETLSource = (typeof ETL_SOURCES)[number];

export async function triggerFullIngest(): Promise<void> {
  await addJob('etl', 'full-sync', { source: 'full-sync' });
}

export async function triggerSourceIngest(source: ETLSource): Promise<void> {
  if (source === 'wikidata-titles') {
    // T448 — rede externa (endpoint SPARQL): retry + backoff no nível do job
    // (o HTTP interno já tem o retry do http-resilience; o de job cobre
    // queda de processo/timeout de rodada inteira).
    await addJob(
      'etl',
      'source-ingest',
      { source },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    return;
  }
  await addJob('etl', 'source-ingest', { source });
}
