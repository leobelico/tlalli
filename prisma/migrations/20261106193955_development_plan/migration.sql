-- AlterTable
ALTER TABLE "units" ADD COLUMN     "plan_shape" JSONB;

-- CreateTable
CREATE TABLE "development_plans" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "development_id" UUID NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "development_plans_development_id_key" ON "development_plans"("development_id");

-- CreateIndex
CREATE INDEX "development_plans_organization_id_idx" ON "development_plans"("organization_id");

-- AddForeignKey
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_development_id_fkey" FOREIGN KEY ("development_id") REFERENCES "developments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for the new tenant table (same pattern as 20261105191321_rls).
ALTER TABLE "development_plans" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "development_plans" TO app_rls;
CREATE POLICY tenant_isolation ON "development_plans" TO app_rls
  USING (organization_id = public.app_current_org())
  WITH CHECK (organization_id = public.app_current_org());
REVOKE ALL ON "development_plans" FROM anon, authenticated;
