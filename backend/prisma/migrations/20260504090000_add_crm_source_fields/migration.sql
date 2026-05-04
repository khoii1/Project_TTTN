-- Add common source tracking fields for CRM records.
ALTER TABLE "leads" ADD COLUMN "source_detail" TEXT;

ALTER TABLE "accounts" ADD COLUMN "source" TEXT;
ALTER TABLE "accounts" ADD COLUMN "source_detail" TEXT;

ALTER TABLE "contacts" ADD COLUMN "source" TEXT;
ALTER TABLE "contacts" ADD COLUMN "source_detail" TEXT;

ALTER TABLE "opportunities" ADD COLUMN "source" TEXT;
ALTER TABLE "opportunities" ADD COLUMN "source_detail" TEXT;

ALTER TABLE "cases" ADD COLUMN "source" TEXT;
ALTER TABLE "cases" ADD COLUMN "source_detail" TEXT;
