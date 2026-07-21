-- CreateIndex
CREATE INDEX "billings_userId_status_paidAt_idx" ON "billings"("userId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "clubs_country_status_idx" ON "clubs"("country", "status");

-- CreateIndex
CREATE INDEX "clubs_city_state_idx" ON "clubs"("city", "state");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "users_email_status_idx" ON "users"("email", "status");
