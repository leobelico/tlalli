-- QA B01: a unit can be held (APARTADO) or sold (VENDIDO) by at most one lead.
-- Partial unique indexes cannot be expressed in schema.prisma; this is the database-level
-- safety net behind the checks in services/inventory.ts and services/pipeline.ts.
CREATE UNIQUE INDEX "leads_one_hold_per_unit"
  ON "leads" ("unit_id")
  WHERE "unit_id" IS NOT NULL AND "stage" IN ('APARTADO', 'VENDIDO');
