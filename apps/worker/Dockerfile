# Worker Dockerfile — mesmo padrão do apps/api/Dockerfile: roda src via tsx e
# o stage final instala (com devDeps: prisma CLI + tsx) e gera o Prisma Client
# no próprio stage. NADA de COPY de node_modules entre stages — com pnpm o
# client nasce no node_modules do workspace (apps/api/node_modules/.prisma),
# não na raiz, e copiar entre stages quebrou o build (gate do deploy).
# OpenSSL nos dois stages: engines do Prisma em alpine (musl) o exigem.

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@11 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/

COPY apps/worker/src ./apps/worker/src/
COPY apps/api/src ./apps/api/src/
COPY packages/domain/src ./packages/domain/src/

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@11 --activate

ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/

# devDeps DE propósito: prisma CLI (generate abaixo) e tsx (runtime do entry)
RUN pnpm install --frozen-lockfile --filter @almanaque/worker --filter @almanaque/api --filter @almanaque/domain 2>&1

COPY apps/api/prisma/ ./apps/api/prisma/
RUN pnpm --filter @almanaque/api exec prisma generate --schema=prisma/schema.prisma 2>&1

COPY --from=builder /app/apps/worker/src ./apps/worker/src/
COPY --from=builder /app/apps/api/src ./apps/api/src/
COPY --from=builder /app/packages/domain/src ./packages/domain/src/

# cwd = pacote do worker: é assim que o tsx resolve (apps/worker/node_modules) —
# o container da API roda os scripts do mesmo jeito (cd /app/apps/api).
WORKDIR /app/apps/worker
CMD ["node", "--import=tsx", "src/main.ts"]
