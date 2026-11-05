import "server-only";
import { rootPrisma } from "@/server/db/root";

/** Public, read-only: current privacy notice of an organization by slug. */
export async function getPublicPrivacyNotice(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const org = await rootPrisma.organization.findUnique({
    where: { slug },
    select: {
      name: true,
      privacyNotices: { orderBy: { version: "desc" }, take: 1, select: { version: true, content: true, createdAt: true } },
    },
  });
  if (!org || !org.privacyNotices[0]) return null;
  return { orgName: org.name, ...org.privacyNotices[0] };
}
