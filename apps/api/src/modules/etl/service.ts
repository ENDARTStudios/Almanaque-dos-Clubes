import { addJob } from '../../services/queue.js';

export const ETL_SOURCES = ['rsssf', 'fbref', 'wikipedia'] as const;
export type ETLSource = (typeof ETL_SOURCES)[number];

export async function triggerFullIngest(): Promise<void> {
  for (const source of ETL_SOURCES) {
    await addJob('etl', 'full-ingest', { source });
  }
}

export async function triggerSourceIngest(source: ETLSource): Promise<void> {
  await addJob('etl', 'source-ingest', { source });
}
