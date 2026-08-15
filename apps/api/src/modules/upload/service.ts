import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { s3Client } from '../../config/s3.js';
import { env } from '../../config/env.js';

function buildPublicUrl(key: string): string {
  if (env.s3PublicUrl) {
    return `${env.s3PublicUrl.replace(/\/$/, '')}/${key}`;
  }
  return `${env.s3Endpoint.replace(/\/$/, '')}/${env.s3Bucket}/${key}`;
}

const MIME_MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xff, 0xd8, 0xff])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  'text/csv': [], // no reliable magic bytes
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MIME_MAGIC_BYTES[mimeType];
  if (!signatures || signatures.length === 0) return true;
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

function validateFile(buffer: Buffer, mimeType: string, originalName: string): void {
  if (buffer.length > env.uploadMaxBytes) {
    throw new Error(
      `Arquivo excede o limite de ${Math.round(env.uploadMaxBytes / 1024 / 1024)} MiB`,
    );
  }
  if (!env.uploadAllowedMimes.includes(mimeType)) {
    throw new Error(`Tipo MIME não permitido: ${mimeType}`);
  }
  if (!validateMagicBytes(buffer, mimeType)) {
    throw new Error(`Magic bytes não correspondem ao tipo declarado: ${mimeType}`);
  }
  const ext = originalName.split('.').pop()?.toLowerCase();
  if (!ext || ext.length > 10) {
    throw new Error('Extensão de arquivo inválida');
  }
}

export interface UploadResult {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  folder = 'uploads',
): Promise<UploadResult> {
  validateFile(buffer, mimeType, originalName);
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'bin';
  const key = `${folder}/${randomUUID()}.${ext}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
  const url = buildPublicUrl(key);
  return { key, url, mimeType, sizeBytes: buffer.length };
}
