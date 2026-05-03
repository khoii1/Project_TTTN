-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES', 'SUPPORT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'NURTURING', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('QUALIFY', 'PROPOSE', 'NEGOTIATE', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('NEW', 'WORKING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "refresh_token_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SALES',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "converted_account_id" TEXT,
    "converted_contact_id" TEXT,
    "converted_opportunity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "type" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "billing_country" TEXT,
    "billing_street" TEXT,
    "billing_city" TEXT,
    "billing_state" TEXT,
    "billing_postal_code" TEXT,
    "shipping_country" TEXT,
    "shipping_street" TEXT,
    "shipping_city" TEXT,
    "shipping_state" TEXT,
    "shipping_postal_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "mailing_country" TEXT,
    "mailing_street" TEXT,
    "mailing_city" TEXT,
    "mailing_state" TEXT,
    "mailing_postal_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "name" TEXT NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'QUALIFY',
    "amount" DECIMAL(15,2),
    "close_date" TIMESTAMP(3),
    "next_step" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "related_type" TEXT,
    "related_id" TEXT,
    "description" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "related_type" TEXT NOT NULL,
    "related_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "account_id" TEXT,
    "contact_id" TEXT,
    "subject" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'NEW',
    "priority" "CasePriority" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "leads_organization_id_idx" ON "leads"("organization_id");

-- CreateIndex
CREATE INDEX "leads_owner_id_idx" ON "leads"("owner_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "accounts_organization_id_idx" ON "accounts"("organization_id");

-- CreateIndex
CREATE INDEX "accounts_owner_id_idx" ON "accounts"("owner_id");

-- CreateIndex
CREATE INDEX "contacts_organization_id_idx" ON "contacts"("organization_id");

-- CreateIndex
CREATE INDEX "contacts_owner_id_idx" ON "contacts"("owner_id");

-- CreateIndex
CREATE INDEX "contacts_account_id_idx" ON "contacts"("account_id");

-- CreateIndex
CREATE INDEX "opportunities_organization_id_idx" ON "opportunities"("organization_id");

-- CreateIndex
CREATE INDEX "opportunities_owner_id_idx" ON "opportunities"("owner_id");

-- CreateIndex
CREATE INDEX "opportunities_account_id_idx" ON "opportunities"("account_id");

-- CreateIndex
CREATE INDEX "opportunities_contact_id_idx" ON "opportunities"("contact_id");

-- CreateIndex
CREATE INDEX "opportunities_stage_idx" ON "opportunities"("stage");

-- CreateIndex
CREATE INDEX "tasks_organization_id_idx" ON "tasks"("organization_id");

-- CreateIndex
CREATE INDEX "tasks_owner_id_idx" ON "tasks"("owner_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_id_idx" ON "tasks"("assigned_to_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "notes_organization_id_idx" ON "notes"("organization_id");

-- CreateIndex
CREATE INDEX "notes_owner_id_idx" ON "notes"("owner_id");

-- CreateIndex
CREATE INDEX "notes_related_type_idx" ON "notes"("related_type");

-- CreateIndex
CREATE INDEX "notes_related_id_idx" ON "notes"("related_id");

-- CreateIndex
CREATE INDEX "cases_organization_id_idx" ON "cases"("organization_id");

-- CreateIndex
CREATE INDEX "cases_owner_id_idx" ON "cases"("owner_id");

-- CreateIndex
CREATE INDEX "cases_account_id_idx" ON "cases"("account_id");

-- CreateIndex
CREATE INDEX "cases_contact_id_idx" ON "cases"("contact_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
