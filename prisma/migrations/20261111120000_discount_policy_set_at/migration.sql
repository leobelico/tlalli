-- QA2 B38: when the admin first saved the asesor discount cap (first-day guide).
ALTER TABLE "organizations" ADD COLUMN "discount_policy_set_at" TIMESTAMP(3);
