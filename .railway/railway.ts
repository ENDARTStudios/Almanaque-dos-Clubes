import {
  bucket,
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  redis,
  service,
  volume,
} from 'railway/iac';

export default defineRailway(() => {
  // Fonte do repositório. O gerador nomeou esta constante com o MESMO identificador do
  // serviço da API (o slug do repo e o nome do serviço colidem no camelCase) e o arquivo
  // não compilava — `railway config plan` acusou na hora. Renomeada para `repo`.
  const repo = github('ENDARTStudios/Almanaque-dos-Clubes', { checkSuites: false });

  const Redis = redis('Redis', { region: 'sfo' });
  Redis.deploy = {
    startCommand:
      '/bin/sh -c "rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH"',
  };
  const Postgres = postgres('Postgres', { region: 'sfo' });
  const postgresVolume = volume('postgres-volume', {
    alerts: { usage: { '100': {}, '80': {}, '95': {} } },
    allowOnlineResize: true,
    region: 'sfo',
    sizeMB: 5000,
  });
  const redisVolume = volume('redis-volume', {
    alerts: { usage: { '100': {}, '80': {}, '95': {} } },
    allowOnlineResize: true,
    region: 'sfo',
    sizeMB: 5000,
  });
  const PostgresPITR = bucket('Postgres-PITR', { region: 'sjc' });
  const mediaWorker = service('media-worker', {
    source: repo,
    replicas: { sfo: 1 },
    env: {
      APP_URL: preserve(),
      DATABASE_URL: preserve(),
      JWT_REFRESH_SECRET: preserve(),
      JWT_SECRET: preserve(),
      LOG_LEVEL: preserve(),
      NODE_ENV: preserve(),
      PRISMA_SCHEMA_PROVIDER: preserve(),
      RAILWAY_CONFIG_FILE: preserve(),
      RAILWAY_DOCKERFILE_PATH: preserve(),
      REDIS_URL: preserve(),
    },
  });
  const AlmanaqueDosClubes = service('Almanaque-dos-Clubes', {
    source: repo,
    replicas: { sfo: 1 },
    domains: [{ domain: 'api.almanaquedosclubes.com', port: 3000 }],
    networking: { privateNetworkEndpoint: 'almanaque-dos-clubes' },
    env: {
      APP_URL: preserve(),
      BACKUP_SECRET: preserve(),
      BIRTHDAY_GIFT_ENABLED: preserve(),
      DATABASE_URL: preserve(),
      DATABASE_URL_APP: preserve(),
      ETL_SCHEDULER_ENABLED: preserve(),
      GITHUB_TOKEN: preserve(),
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      HOST: preserve(),
      JWT_REFRESH_SECRET: preserve(),
      JWT_SECRET: preserve(),
      LOG_LEVEL: preserve(),
      MEDIA_WORKER_LOCAL: preserve(),
      NODE_ENV: preserve(),
      PAYMENTS_ENABLED: preserve(),
      PORT: preserve(),
      PRISMA_SCHEMA_PROVIDER: preserve(),
      R2_ACCESS_KEY_ID: preserve(),
      R2_ACCOUNT_ID: preserve(),
      R2_BUCKET: preserve(),
      R2_ENDPOINT: preserve(),
      R2_SECRET_ACCESS_KEY: preserve(),
      RAILWAY_DOCKERFILE_PATH: preserve(),
      RANKING_CRON_AUTO: preserve(),
      REDIS_URL: preserve(),
      RESEND_API_KEY: preserve(),
      STRIPE_PRICE_ELITE_MONTH_BRL: preserve(),
      STRIPE_PRICE_ELITE_MONTH_EUR: preserve(),
      STRIPE_PRICE_ELITE_MONTH_USD: preserve(),
      STRIPE_PRICE_ELITE_YEAR_BRL: preserve(),
      STRIPE_PRICE_ELITE_YEAR_EUR: preserve(),
      STRIPE_PRICE_ELITE_YEAR_USD: preserve(),
      STRIPE_PRICE_PRO_MONTH_BRL: preserve(),
      STRIPE_PRICE_PRO_MONTH_EUR: preserve(),
      STRIPE_PRICE_PRO_MONTH_USD: preserve(),
      STRIPE_PRICE_PRO_YEAR_BRL: preserve(),
      STRIPE_PRICE_PRO_YEAR_EUR: preserve(),
      STRIPE_PRICE_PRO_YEAR_USD: preserve(),
      STRIPE_PUBLISHABLE_KEY: preserve(),
      STRIPE_SECRET_KEY: preserve(),
      STRIPE_WEBHOOK_SECRET: preserve(),
      T430_PROBE: preserve(),
      WIKIDATA_DRY_RUN: preserve(),
    },
  });
  const emailWorker = service('email-worker', {
    source: repo,
    replicas: { sfo: 1 },
    env: {
      APP_URL: preserve(),
      DATABASE_URL: preserve(),
      JWT_REFRESH_SECRET: preserve(),
      JWT_SECRET: preserve(),
      RAILWAY_DOCKERFILE_PATH: preserve(),
      REDIS_URL: preserve(),
      RESEND_API_KEY: preserve(),
      WORKER_MODE: preserve(),
    },
  });

  return project('Almanaque dos Clubes', {
    resources: [
      Redis,
      mediaWorker,
      Postgres,
      AlmanaqueDosClubes,
      emailWorker,
      postgresVolume,
      redisVolume,
      PostgresPITR,
    ],
  });
});
