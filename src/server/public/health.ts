import "server-only";
import { rootPrisma } from "@/server/db/root";

/** Host, port and user of DATABASE_URL (never the password) so a wrong connection string is easy to spot. */
export function describeDatabaseUrl(raw: string | undefined) {
  if (!raw) return { set: false };
  try {
    const u = new URL(raw);
    return { set: true, host: u.hostname, port: u.port || "(default)", user: decodeURIComponent(u.username), database: u.pathname.slice(1), params: [...u.searchParams.keys()] };
  } catch {
    return { set: true, parsable: false, hint: "DATABASE_URL no es una URL válida: revisa símbolos sin codificar en la contraseña (? @ # /)." };
  }
}

/** Does the database answer? If not, a short reason with any connection string removed. */
export async function checkDatabase(): Promise<{ ok: true; organizaciones: number } | { ok: false; error: string }> {
  try {
    await rootPrisma.$queryRaw`SELECT 1`;
    const rows = await rootPrisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM organizations`;
    return { ok: true, organizaciones: rows[0]?.n ?? 0 };
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).replace(/postgres(ql)?:\/\/\S+/gi, "[url]").split("\n").filter(Boolean).slice(-2).join(" | ").slice(0, 300);
    return { ok: false, error: message };
  }
}
