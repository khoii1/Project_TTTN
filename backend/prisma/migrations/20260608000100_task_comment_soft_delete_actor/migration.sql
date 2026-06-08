ALTER TABLE "task_comments"
ADD COLUMN "deleted_by_id" TEXT;

CREATE INDEX "task_comments_deleted_by_id_idx" ON "task_comments"("deleted_by_id");

ALTER TABLE "task_comments"
ADD CONSTRAINT "task_comments_deleted_by_id_fkey"
FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
