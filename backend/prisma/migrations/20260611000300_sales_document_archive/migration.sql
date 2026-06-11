ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "quotes"
  ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "canceled_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;

ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "canceled_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;

CREATE INDEX IF NOT EXISTS "quotes_deleted_at_idx" ON "quotes"("deleted_at");
CREATE INDEX IF NOT EXISTS "quotes_canceled_at_idx" ON "quotes"("canceled_at");
CREATE INDEX IF NOT EXISTS "contracts_deleted_at_idx" ON "contracts"("deleted_at");
CREATE INDEX IF NOT EXISTS "contracts_canceled_at_idx" ON "contracts"("canceled_at");
