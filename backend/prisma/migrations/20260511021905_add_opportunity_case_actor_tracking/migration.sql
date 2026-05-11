-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "closed_by_id" TEXT;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "stage_changed_at" TIMESTAMP(3),
ADD COLUMN     "stage_changed_by_id" TEXT;

-- CreateIndex
CREATE INDEX "cases_closed_by_id_idx" ON "cases"("closed_by_id");

-- CreateIndex
CREATE INDEX "opportunities_stage_changed_by_id_idx" ON "opportunities"("stage_changed_by_id");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stage_changed_by_id_fkey" FOREIGN KEY ("stage_changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
