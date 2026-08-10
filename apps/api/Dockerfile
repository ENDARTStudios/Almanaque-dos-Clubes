# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/domain/package.json packages/domain/tsconfig.json ./packages/domain/
RUN pnpm install --frozen-lockfile --filter @almanaque/api --filter @almanaque/domain
COPY packages/domain/src/ ./packages/domain/src/
COPY apps/api/prisma/ ./apps/api/prisma/
COPY apps/api/src/ ./apps/api/src/
RUN pnpm --filter @almanaque/api prisma:generate && pnpm --filter @almanaque/api build

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11 --activate
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
