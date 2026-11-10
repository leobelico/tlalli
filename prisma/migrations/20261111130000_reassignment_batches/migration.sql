-- QA2 B37: bulk reassignments can be undone for a few seconds.
CREATE TABLE "reassignment_batches" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "to_user_id" UUID,
    "moves" JSONB NOT NULL,
    "undone_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reassignment_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reassignment_batches_organization_id_created_at_idx" ON "reassignment_batches"("organization_id", "created_at");

ALTER TABLE "reassignment_batches" ADD CONSTRAINT "reassignment_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for the new tenant table (same pattern as 20261105191321_rls).
ALTER TABLE "reassignment_batches" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON "reassignment_batches" TO app_rls;
CREATE POLICY tenant_isolation ON "reassignment_batches" TO app_rls
  USING (organization_id = public.app_current_org())
  WITH CHECK (organization_id = public.app_current_org());
REVOKE ALL ON "reassignment_batches" FROM anon, authenticated;
