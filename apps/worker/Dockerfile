# Worker Dockerfile — multi-stage
# =============================================================================

# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/

RUN pnpm install --frozen-lockfile --filter @almanaque/worker --filter @almanaque/api --filter @almanaque/domain 2>&1

COPY apps/worker/src ./apps/worker/src/
COPY apps/api/src ./apps/api/src/
COPY packages/domain/src ./packages/domain/src/

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11 --activate

ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/

RUN pnpm install --frozen-lockfile --filter @almanaque/worker --filter @almanaque/api --filter @almanaque/domain --prod 2>&1

COPY --from=builder /app/apps/worker/src ./apps/worker/src/
COPY --from=builder /app/apps/api/src ./apps/api/src/
COPY --from=builder /app/packages/domain/src ./packages/domain/src/
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

CMD ["node", "--import=tsx", "apps/worker/src/etl-worker.ts"]