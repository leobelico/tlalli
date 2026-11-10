import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { rootPrisma } from "@/server/db/root";

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

function describeDatabaseUrl(raw: string | undefined) {
  if (!raw) return { set: false };
  try {
    const u = new URL(raw);
    return { set: true, host: u.hostname, port: u.port || "(default)", user: decodeURIComponent(u.username), database: u.pathname.slice(1), params: [...u.searchParams.keys()] };
  } catch {
    return { set: true, parsable: false, hint: "DATABASE_URL no es una URL válida: revisa símbolos sin codificar en la contraseña (? @ # /)." };
  }
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
  try {
    const rows = await rootPrisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    const tables = await rootPrisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM organizations`;
    return NextResponse.json({ ok: rows[0]?.ok === 1, db: "responde", organizaciones: tables[0]?.n, database, env });
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).replace(/postgres(ql)?:\/\/\S+/gi, "[url]").split("\n").filter(Boolean).slice(-2).join(" | ").slice(0, 300);
    return NextResponse.json({ ok: false, db: "no responde", error: message, database, env }, { status: 500 });
  }
}
