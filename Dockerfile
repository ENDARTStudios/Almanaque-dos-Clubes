FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/

RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain 2>&1

COPY apps/api/prisma/ ./apps/api/prisma/
RUN pnpm --filter @almanaque/api exec prisma generate --schema=prisma/schema.prisma 2>&1

COPY apps/api/src ./apps/api/src/
COPY packages/domain/src ./packages/domain/src/

RUN pnpm --filter @almanaque/domain build 2>&1 && pnpm --filter @almanaque/api build 2>&1

FROM node:22-slim
WORKDIR /app

# T446 — postgresql-client no stage de produção: pg_dump/pg_restore
# disponíveis in-container para o backup diário (sem depender do container
# Postgres para executar). Cliente major 16 = servidor major 16.
RUN apt-get update -y && apt-get install -y openssl ca-certificates postgresql-client --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11 --activate

ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/

# Instala com devDeps (precisamos do prisma para generate)
RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain 2>&1

# Gera o Prisma Client no stage de produção (schema está em apps/api/prisma/)
COPY apps/api/prisma/ ./apps/api/prisma/
RUN pnpm --filter @almanaque/api exec prisma generate --schema=prisma/schema.prisma 2>&1

COPY --from=builder /app/apps/api/dist ./apps/api/dist/
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist/

# T430 — job-runnability: scripts de ETL/seeds executáveis em produção
COPY apps/api/scripts/ ./apps/api/scripts/

# T430 — entrypoint aplica `migrate deploy` (fail-fast) antes do servidor.
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
