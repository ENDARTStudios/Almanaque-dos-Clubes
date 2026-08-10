import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

export const s3Client = new S3Client({
  endpoint: env.s3Endpoint,
  region: env.s3Region,
  credentials: { accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey },
  forcePathStyle: true,
});
