import "server-only";
import type { Plan } from "@/generated/prisma/enums";
import { rootPrisma } from "@/server/db/root";
import { defaultPrivacyNotice } from "@/lib/privacy";
import { randomToken, slugify } from "@/lib/tokens";

/**
 * Creates an organization with its first admin. Uses the root client because the
 * tenant does not exist yet (there is no org id to scope RLS to).
 */
export async function createOrganization(input: { name: string; ownerId: string; plan?: Plan }) {
  const base = slugify(input.name) || "inmobiliaria";
  const slug = `${base}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  return rootPrisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        plan: input.plan ?? "BASICO",
        leadFormKey: `lfk_${randomToken(24)}`,
      },
    });
    await tx.membership.create({
      data: { organizationId: org.id, userId: input.ownerId, role: "ADMIN" },
    });
    await tx.privacyNotice.create({
      data: {
        organizationId: org.id,
        version: 1,
        content: defaultPrivacyNotice(input.name),
        createdById: input.ownerId,
      },
    });
    return org;
  });
}
