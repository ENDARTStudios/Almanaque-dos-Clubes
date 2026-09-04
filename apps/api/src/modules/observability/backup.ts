/**
 * T422 — Backup para S3-compatível + verificacao de integridade.
 * Reutiliza o dump logico JSON gzip de backup-db.ts; aqui adicionamos upload para
 * S3 (MinIO local ou Backblaze B2) e verificacao de integridade (gunzip + JSON parse).
 */
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

// Abstração mínima do cliente S3 (injetável para teste e reutilizando config/s3.ts).
export interface BucketClient {
  send(input: { Bucket: string; Key: string; Body: Buffer; ContentType: string }): Promise<unknown>;
}

export interface BackupVerifyResult {
  ok: boolean;
  tables: number;
  totalRows: number;
  error?: string;
}

/** Le um backup gzip, descompacta e valida o JSON. Sincrona e testavel. */
export function verifyBackupGzip(content: Buffer): BackupVerifyResult {
  try {
    const raw = gunzipSync(content).toString('utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown[]>;
    let tables = 0;
    let rows = 0;
    for (const v of Object.values(parsed)) {
      if (Array.isArray(v)) {
        tables++;
        rows += v.length;
      }
    }
    return { ok: true, tables, totalRows: rows };
  } catch (e) {
    return { ok: false, tables: 0, totalRows: 0, error: (e as Error).message };
  }
}

/** Sobe um backup gzip para o bucket S3 (via cliente injetado). Nao fabrica sucesso. */
export async function uploadBackupToS3(
  localPath: string,
  key: string,
  client: BucketClient,
  bucket: string,
): Promise<{ key: string }> {
  const body = readFileSync(localPath);
  await client.send({ Bucket: bucket, Key: key, Body: body, ContentType: 'application/gzip' });
  return { key };
}
