-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "restored_at" TIMESTAMP(3),
ADD COLUMN     "restored_by_id" TEXT;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "restored_at" TIMESTAMP(3),
ADD COLUMN     "restored_by_id" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "restored_at" TIMESTAMP(3),
ADD COLUMN     "restored_by_id" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "restored_at" TIMESTAMP(3),
ADD COLUMN     "restored_by_id" TEXT;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "restored_at" TIMESTAMP(3),
ADD COLUMN     "restored_by_id" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "restored_at" TIMESTAMP(3),
ADD COLUMN     "restored_by_id" TEXT;

-- CreateIndex
CREATE INDEX "accounts_deleted_by_id_idx" ON "accounts"("deleted_by_id");

-- CreateIndex
CREATE INDEX "accounts_restored_by_id_idx" ON "accounts"("restored_by_id");

-- CreateIndex
CREATE INDEX "cases_deleted_by_id_idx" ON "cases"("deleted_by_id");

-- CreateIndex
CREATE INDEX "cases_restored_by_id_idx" ON "cases"("restored_by_id");

-- CreateIndex
CREATE INDEX "contacts_deleted_by_id_idx" ON "contacts"("deleted_by_id");

-- CreateIndex
CREATE INDEX "contacts_restored_by_id_idx" ON "contacts"("restored_by_id");

-- CreateIndex
CREATE INDEX "leads_deleted_by_id_idx" ON "leads"("deleted_by_id");

-- CreateIndex
CREATE INDEX "leads_restored_by_id_idx" ON "leads"("restored_by_id");

-- CreateIndex
CREATE INDEX "opportunities_deleted_by_id_idx" ON "opportunities"("deleted_by_id");

-- CreateIndex
CREATE INDEX "opportunities_restored_by_id_idx" ON "opportunities"("restored_by_id");

-- CreateIndex
CREATE INDEX "tasks_deleted_by_id_idx" ON "tasks"("deleted_by_id");

-- CreateIndex
CREATE INDEX "tasks_restored_by_id_idx" ON "tasks"("restored_by_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_restored_by_id_fkey" FOREIGN KEY ("restored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_restored_by_id_fkey" FOREIGN KEY ("restored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_restored_by_id_fkey" FOREIGN KEY ("restored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_restored_by_id_fkey" FOREIGN KEY ("restored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_restored_by_id_fkey" FOREIGN KEY ("restored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_restored_by_id_fkey" FOREIGN KEY ("restored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
