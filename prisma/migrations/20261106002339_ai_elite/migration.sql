-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('LEAD_ASSISTANT', 'WEEKLY_INSIGHTS');

-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'ELITE';

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_organization_id_created_at_idx" ON "ai_usage"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for the new tenant table (same pattern as 20261105191321_rls).
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON "ai_usage" TO app_rls;
CREATE POLICY tenant_isolation ON "ai_usage" TO app_rls
  USING (organization_id = public.app_current_org())
  WITH CHECK (organization_id = public.app_current_org());
REVOKE ALL ON "ai_usage" FROM anon, authenticated;
