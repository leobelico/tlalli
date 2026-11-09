import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDailyDigest } from "@/server/public/digest";

/**
 * Daily digest trigger. Call it once a day (Vercel Cron, GitHub Actions, any scheduler):
 *   GET /api/cron/daily-digest   Authorization: Bearer <CRON_SECRET>
 * Closed by default: without CRON_SECRET configured every call is rejected.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const result = await runDailyDigest();
  return NextResponse.json({ ok: true, ...result });
}
