import { addJob } from '../../services/queue.js';

export const ETL_SOURCES = [
  'wikidata',
  'rsssf',
  'fbref',
  'football-data',
  'openstreetmap',
  'wikimedia-commons',
  'thesportsdb',
  'full-sync',
] as const;
export type ETLSource = (typeof ETL_SOURCES)[number];

export async function triggerFullIngest(): Promise<void> {
  await addJob('etl', 'full-sync', { source: 'full-sync' });
}

export async function triggerSourceIngest(source: ETLSource): Promise<void> {
  await addJob('etl', 'source-ingest', { source });
}
