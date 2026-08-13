# =============================================================================
# Stage 1: Build — instala deps, gera client Prisma, compila TypeScript
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/

RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain 2>&1

COPY apps/api/prisma/schema.prisma ./apps/api/prisma/
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma 2>&1

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

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/

RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain --prod 2>&1

COPY apps/api/prisma/schema.prisma ./apps/api/prisma/
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma 2>&1

COPY --from=builder /app/apps/api/dist ./apps/api/dist/
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist/

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
