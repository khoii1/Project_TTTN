-- Add action actor tracking for task completion and lead conversion.
ALTER TABLE "tasks" ADD COLUMN "completed_by_id" TEXT;

ALTER TABLE "leads" ADD COLUMN "converted_at" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "converted_by_id" TEXT;

CREATE INDEX "tasks_completed_by_id_idx" ON "tasks"("completed_by_id");
CREATE INDEX "leads_converted_by_id_idx" ON "leads"("converted_by_id");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_by_id_fkey" FOREIGN KEY ("converted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
