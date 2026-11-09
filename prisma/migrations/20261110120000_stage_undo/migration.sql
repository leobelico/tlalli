-- Pilot item 7: undo a stage change for a few seconds. Snapshot of the lead/unit before the move.
ALTER TABLE "lead_stage_events" ADD COLUMN "undo_snapshot" JSONB;
ALTER TABLE "lead_stage_events" ADD COLUMN "undone_at" TIMESTAMP(3);
