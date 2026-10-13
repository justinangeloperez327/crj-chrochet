-- Additive provider support; existing Stripe attempts keep their live-mode default.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'ZIINA';
ALTER TABLE "PaymentAttempt" ADD COLUMN "testMode" BOOLEAN NOT NULL DEFAULT false;
