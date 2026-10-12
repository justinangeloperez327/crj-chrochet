-- Email verification, password reset, and authentication attempt throttling.
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
CREATE TABLE "AuthToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AuthTokenType" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_userId_type_createdAt_idx" ON "AuthToken"("userId", "type", "createdAt");
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AuthThrottle" (
  "key" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("key")
);
