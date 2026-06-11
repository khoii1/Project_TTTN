-- CreateTable
CREATE TABLE "opportunity_attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_bucket" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "opportunity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunity_attachments_organization_id_idx" ON "opportunity_attachments"("organization_id");

-- CreateIndex
CREATE INDEX "opportunity_attachments_opportunity_id_idx" ON "opportunity_attachments"("opportunity_id");

-- CreateIndex
CREATE INDEX "opportunity_attachments_uploaded_by_id_idx" ON "opportunity_attachments"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "opportunity_attachments_deleted_at_idx" ON "opportunity_attachments"("deleted_at");

-- AddForeignKey
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
