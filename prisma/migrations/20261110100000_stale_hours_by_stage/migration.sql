-- QA B18: per-stage thresholds for the "cold lead" alert ({"CONTACTADO": 72, ...}). Empty = defaults.
ALTER TABLE "organizations" ADD COLUMN "stale_hours_by_stage" JSONB NOT NULL DEFAULT '{}';
