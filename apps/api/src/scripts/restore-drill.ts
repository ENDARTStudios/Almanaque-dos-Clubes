/**
 * T446 — Restore drill: baixa o backup mais recente do R2, restaura em um DB
 * efêmero, compara counts com produção e limpa.
 *
 * Uso in-container:
 *   node dist/scripts/restore-drill.js
 *
 * Exit 0 = DRILL-OK (counts idênticos). Exit 1 = falha em qualquer etapa.
 * Segurança: credenciais via PG* env herdado (spawnSync) — nunca em argv.
 * Princípio 1.3: os counts são comparados com produção ao vivo — o drill
 * prova que o backup RESTAURA, não apenas que existe.
 */
import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { spawnSync, execSync } from 'node:child_process';
import { writeFileSync, unlinkSync, statSync } from 'node:fs';

const prisma = new PrismaClient();

const BUCKET = process.env.R2_BUCKET ?? '';
const ENDPOINT = process.env.R2_ENDPOINT ?? '';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const OWNER_URL = process.env.DATABASE_URL ?? '';

if (!BUCKET || !ENDPOINT || !ACCESS_KEY || !SECRET_KEY || !OWNER_URL) {
  console.error(JSON.stringify({ ok: false, error: 'vars R2_*/DATABASE_URL ausentes' }));
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'auto',
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

function run(
  cmd: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): { code: number; stderr: string } {
  const r = spawnSync(cmd, args, {
    env: env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 300_000,
    maxBuffer: 512 * 1024 * 1024,
  });
  return { code: r.status ?? 1, stderr: r.stderr?.toString() ?? '' };
}

async function main(): Promise<void> {
  // 1. Baixa o backup mais recente do R2
  const listRes = await s3.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'backups/', MaxKeys: 20 }),
  );
  const sorted = (listRes.Contents ?? []).sort(
    (a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
  );
  const latest = sorted[0];
  if (!latest) {
    console.error(JSON.stringify({ ok: false, error: 'nenhum backup no R2' }));
    process.exit(1);
  }
  const key = latest.Key;
  console.log(JSON.stringify({ step: 'download', key, size: latest.Size }));

  const r2Res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Buffer[] = [];
  for await (const chunk of r2Res.Body as AsyncIterable<Buffer>) chunks.push(chunk);
  const dumpPath = '/tmp/t446-drill.dump';
  writeFileSync(dumpPath, Buffer.concat(chunks));
  const localSize = statSync(dumpPath).size;
  console.log(JSON.stringify({ step: 'download-ok', localSize }));

  // 2. Cria DB efêmero e restaura via pg_restore (env herdado, nunca argv)
  const drillDb = `t446_drill_${Date.now()}`;
  const pgEnv: NodeJS.ProcessEnv = (() => {
    const url = new URL(OWNER_URL);
    return {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port || '5432',
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: url.pathname.slice(1),
    };
  })();

  execSync(`createdb "${drillDb}"`, { env: pgEnv, stdio: 'pipe' });
  const restore = run(
    'pg_restore',
    ['--dbname', drillDb, '--no-owner', '--no-privileges', dumpPath],
    pgEnv,
  );
  if (restore.code !== 0) {
    console.error(
      JSON.stringify({ step: 'pg_restore', ok: false, stderr: restore.stderr.slice(0, 300) }),
    );
    execSync(`dropdb --if-exists "${drillDb}"`, { env: pgEnv });
    process.exit(1);
  }
  console.log(JSON.stringify({ step: 'pg_restore', ok: true, drillDb }));

  // 3. Counts no DB efêmero vs produção (via Prisma owner)
  const tables = ['clubs', 'players', 'competitions', 'users', 'rankings'];
  const results: Array<{ table: string; prod: number; drill: number; match: boolean }> = [];
  let allMatch = true;

  const drillPrisma = new PrismaClient({
    datasources: { db: { url: `${OWNER_URL.split('?')[0].replace('/railway', '')}/${drillDb}` } },
  });

  for (const t of tables) {
    const prodR = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
      `SELECT count(*) as c FROM "${t}"`,
    );
    const drillR = await drillPrisma.$queryRawUnsafe<Array<{ c: bigint }>>(
      `SELECT count(*) as c FROM "${t}"`,
    );
    const prod = Number(prodR[0]?.c ?? 0);
    const drill = Number(drillR[0]?.c ?? 0);
    const match = prod === drill;
    if (!match) allMatch = false;
    results.push({ table: t, prod, drill, match });
    console.log(JSON.stringify({ table: t, prod, drill, match }));
  }
  await drillPrisma.$disconnect();

  // 4. Limpa DB efêmero
  execSync(`dropdb --if-exists "${drillDb}"`, { env: pgEnv, stdio: 'pipe' });
  unlinkSync(dumpPath);

  // 5. Resultado
  if (!allMatch) {
    console.error(JSON.stringify({ ok: false, error: 'counts divergentes', results }));
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      drill: 'DRILL-OK',
      backupKey: key,
      backupSize: localSize,
      countsMatch: true,
      message: 'Backup restaura com counts idênticos — T446 evidência completa',
    }),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(JSON.stringify({ ok: false, error: (err as Error).message }));
    await prisma.$disconnect();
    process.exit(1);
  });
