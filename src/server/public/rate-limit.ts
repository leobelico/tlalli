import "server-only";
import { rootPrisma } from "@/server/db/root";

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/**
 * Fixed-window counter stored in Postgres, so every app instance shares it (the old in-memory
 * limiter reset per instance and per deploy). One atomic UPSERT per hit (QA B16).
 */
export async function hitRateLimit(key: string, limit: number, windowMs: number, now: Date = new Date()): Promise<RateLimitResult> {
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await rootPrisma.$queryRaw<{ count: number; reset_at: Date }[]>`
    INSERT INTO "rate_limit_buckets" ("key", "count", "reset_at") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit_buckets"."reset_at" <= ${now} THEN 1 ELSE "rate_limit_buckets"."count" + 1 END,
      "reset_at" = CASE WHEN "rate_limit_buckets"."reset_at" <= ${now} THEN ${resetAt} ELSE "rate_limit_buckets"."reset_at" END
    RETURNING "count", "reset_at"`;
  // Housekeeping: drop long-expired buckets now and then.
  if (Math.random() < 0.01) {
    await rootPrisma.$executeRaw`DELETE FROM "rate_limit_buckets" WHERE "reset_at" < ${new Date(now.getTime() - 86_400_000)}`;
  }
  const { count, reset_at } = rows[0];
  const ok = count <= limit;
  return { ok, retryAfterSec: ok ? 0 : Math.max(1, Math.ceil((reset_at.getTime() - now.getTime()) / 1000)) };
}

/** Tests only. */
export async function resetSharedRateLimits() {
  await rootPrisma.$executeRaw`DELETE FROM "rate_limit_buckets"`;
}
