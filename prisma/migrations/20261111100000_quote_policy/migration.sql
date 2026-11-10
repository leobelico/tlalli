-- QA2 B32: reference rate for the equivalent discount and minimums for quotes made by asesores.
ALTER TABLE "organizations" ADD COLUMN "reference_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 4;
ALTER TABLE "organizations" ADD COLUMN "asesor_min_down_pct" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "organizations" ADD COLUMN "asesor_min_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN "asesor_max_months" INTEGER NOT NULL DEFAULT 120;
