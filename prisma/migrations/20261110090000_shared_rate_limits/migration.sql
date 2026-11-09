-- QA B16: rate limit counters shared by every app instance (in-memory limits reset per instance).
-- Not tenant data; only the server (root role) reads it. Default privileges already deny anon/authenticated.
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets"("reset_at");
ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
