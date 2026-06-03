CREATE TABLE "task_templates" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_template_groups" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "task_template_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_template_items" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
  "due_after_days" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "task_template_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_templates_organization_id_idx" ON "task_templates"("organization_id");
CREATE INDEX "task_templates_is_active_idx" ON "task_templates"("is_active");
CREATE INDEX "task_templates_is_default_idx" ON "task_templates"("is_default");
CREATE INDEX "task_template_groups_template_id_idx" ON "task_template_groups"("template_id");
CREATE INDEX "task_template_items_group_id_idx" ON "task_template_items"("group_id");
CREATE INDEX "task_template_items_is_active_idx" ON "task_template_items"("is_active");

ALTER TABLE "task_templates"
  ADD CONSTRAINT "task_templates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_template_groups"
  ADD CONSTRAINT "task_template_groups_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "task_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_template_items"
  ADD CONSTRAINT "task_template_items_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "task_template_groups"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
