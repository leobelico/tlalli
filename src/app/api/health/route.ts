import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { checkDatabase, describeDatabaseUrl } from "@/server/public/health";

/**
 * Deployment check: GET /api/health with `Authorization: Bearer <CRON_SECRET>`.
 * Says whether the database answers and, if not, why (host, port and user of DATABASE_URL, never the
 * password). Closed by default, like the cron endpoint.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const env = {
    appUrl: process.env.APP_URL ?? null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    publicKeySet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    trustedProxy: process.env.TRUSTED_PROXY ?? (process.env.VERCEL ? "(auto: vercel)" : null),
    emailProvider: process.env.EMAIL_PROVIDER ?? "mock",
    formTokenSecretSet: Boolean(process.env.FORM_TOKEN_SECRET),
  };
  const database = describeDatabaseUrl(process.env.DATABASE_URL);
  const result = await checkDatabase();
  return NextResponse.json(result.ok ? { ok: true, db: "responde", organizaciones: result.organizaciones, database, env } : { ok: false, db: "no responde", error: result.error, database, env }, { status: result.ok ? 200 : 500 });
}
