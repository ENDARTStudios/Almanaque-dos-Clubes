# =============================================================================
# Stage 1: Build — instala deps, gera client Prisma, compila TypeScript
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/

RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain 2>&1

COPY apps/api/prisma/ ./apps/api/prisma/
RUN pnpm --filter @almanaque/api exec prisma generate --schema=prisma/schema.prisma 2>&1

COPY apps/api/src ./apps/api/src/
COPY packages/domain/src ./packages/domain/src/

RUN pnpm --filter @almanaque/api build 2>&1

# =============================================================================
# Stage 2: Production — runtime enxuto
# =============================================================================
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11 --activate

ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/

RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain --prod 2>&1

# Copia o Prisma Client gerado no builder (prisma é devDep, não está no --prod)
COPY --from=builder /app/apps/api/prisma/ ./apps/api/prisma/
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

COPY --from=builder /app/apps/api/dist ./apps/api/dist/
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist/

# Entrypoint: executa migrations antes de iniciar o servidor
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
