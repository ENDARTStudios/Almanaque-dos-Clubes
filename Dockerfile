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

RUN pnpm --filter @almanaque/domain build 2>&1 && pnpm --filter @almanaque/api build 2>&1

FROM node:22-alpine
WORKDIR /app

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

EXPOSE 3000
CMD ["node", "apps/api/dist/apps/api/src/server.js"]
