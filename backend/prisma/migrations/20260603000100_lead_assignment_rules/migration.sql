-- Add ward-based Lead assignment fields and rules
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "province_name" TEXT,
  ADD COLUMN IF NOT EXISTS "ward_name" TEXT,
  ADD COLUMN IF NOT EXISTS "address_detail" TEXT;

CREATE TABLE IF NOT EXISTS "lead_assignment_rules" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "province_name" TEXT NOT NULL,
  "ward_name" TEXT NOT NULL,
  "assignee_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lead_assignment_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leads_province_name_ward_name_idx" ON "leads"("province_name", "ward_name");
CREATE INDEX IF NOT EXISTS "lead_assignment_rules_organization_id_idx" ON "lead_assignment_rules"("organization_id");
CREATE INDEX IF NOT EXISTS "lead_assignment_rules_assignee_id_idx" ON "lead_assignment_rules"("assignee_id");
CREATE INDEX IF NOT EXISTS "lead_assignment_rules_province_name_ward_name_idx" ON "lead_assignment_rules"("province_name", "ward_name");
CREATE UNIQUE INDEX IF NOT EXISTS "lead_assignment_rules_active_area_unique" ON "lead_assignment_rules"("organization_id", "province_name", "ward_name") WHERE "is_active" = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_assignment_rules_organization_id_fkey'
  ) THEN
    ALTER TABLE "lead_assignment_rules"
      ADD CONSTRAINT "lead_assignment_rules_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_assignment_rules_assignee_id_fkey'
  ) THEN
    ALTER TABLE "lead_assignment_rules"
      ADD CONSTRAINT "lead_assignment_rules_assignee_id_fkey"
      FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
