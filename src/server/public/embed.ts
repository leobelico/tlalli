import "server-only";
import { rootPrisma } from "@/server/db/root";

/** Sites allowed to frame an organization's hosted form (looked up by slug; the proxy calls this on /f/* only). */
const TTL_MS = 30_000;
const cache = new Map<string, { at: number; origins: string[] }>();

export async function embedOriginsForSlug(slug: string): Promise<string[]> {
  if (!/^[a-z0-9-]{1,80}$/i.test(slug)) return [];
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.origins;
  const org = await rootPrisma.organization.findUnique({ where: { slug }, select: { formEmbedOrigins: true } });
  const origins = org?.formEmbedOrigins ?? [];
  cache.set(slug, { at: Date.now(), origins });
  return origins;
}

export function clearEmbedCache() {
  cache.clear();
}
