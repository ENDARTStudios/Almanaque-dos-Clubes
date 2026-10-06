-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserActivity_userId_createdAt_idx" ON "UserActivity"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserActivity_userId_activityType_createdAt_idx" ON "UserActivity"("userId", "activityType", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- WS-C-14 — CHECK de tipos (invisível ao datamodel Prisma)
ALTER TABLE "UserActivity" ADD CONSTRAINT "user_activity_type_check" CHECK ("activityType" IN ('page_view', 'search', 'favorite_add', 'favorite_remove', 'profile_view', 'notification_read'));
