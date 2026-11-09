-- Pilot item 5: per-organization discount cap + authorization queue for asesores.
ALTER TABLE "organizations" ADD COLUMN "max_asesor_discount_pct" INTEGER NOT NULL DEFAULT 5;

CREATE TYPE "AuthorizationKind" AS ENUM ('DESCUENTO', 'VENTA');
CREATE TYPE "AuthorizationStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

CREATE TABLE "authorization_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" "AuthorizationKind" NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "requested_by_id" UUID NOT NULL,
    "lead_id" UUID,
    "unit_id" UUID,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "result_quote_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "authorization_requests_organization_id_status_created_at_idx" ON "authorization_requests"("organization_id", "status", "created_at");
CREATE INDEX "authorization_requests_requested_by_id_idx" ON "authorization_requests"("requested_by_id");

ALTER TABLE "authorization_requests" ADD CONSTRAINT "authorization_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for the new tenant table (same pattern as 20261105191321_rls).
ALTER TABLE "authorization_requests" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON "authorization_requests" TO app_rls;
CREATE POLICY tenant_isolation ON "authorization_requests" TO app_rls
  USING (organization_id = public.app_current_org())
  WITH CHECK (organization_id = public.app_current_org());
REVOKE ALL ON "authorization_requests" FROM anon, authenticated;
