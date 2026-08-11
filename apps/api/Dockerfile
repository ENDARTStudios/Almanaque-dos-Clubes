FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/
RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain 2>&1 | tail -3
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma 2>&1 | tail -1
COPY apps/api/src ./apps/api/src/
COPY packages/domain/src ./packages/domain/src/
EXPOSE 3000
CMD ["node_modules/.bin/tsx", "apps/api/src/server.ts"]
