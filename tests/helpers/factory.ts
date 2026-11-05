import { randomUUID } from "node:crypto";
import type { Role } from "@/generated/prisma/enums";
import { rootPrisma } from "@/server/db/root";
import { createOrganization } from "@/server/auth/organizations";
import type { Ctx } from "@/server/auth/permissions";

const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];

export async function makeUser(name = "Usuario Prueba") {
  const id = randomUUID();
  const user = await rootPrisma.user.create({
    data: { id, email: `test-${id}@ejemplo.test`, name },
  });
  createdUserIds.push(id);
  return user;
}

/** Creates an org with an admin and returns admin ctx. */
export async function makeOrg(name = "Inmobiliaria Prueba") {
  const admin = await makeUser("Admin Prueba");
  const org = await createOrganization({ name, ownerId: admin.id, plan: "PROFESIONAL" });
  createdOrgIds.push(org.id);
  const adminCtx: Ctx = { orgId: org.id, userId: admin.id, role: "ADMIN" };
  return { org, admin, adminCtx };
}

export async function addMember(orgId: string, role: Role = "ASESOR") {
  const user = await makeUser(role === "ASESOR" ? "Asesor Prueba" : "Admin 2");
  await rootPrisma.membership.create({ data: { organizationId: orgId, userId: user.id, role } });
  const ctx: Ctx = { orgId, userId: user.id, role };
  return { user, ctx };
}

export async function cleanup() {
  if (createdOrgIds.length) {
    await rootPrisma.organization.deleteMany({ where: { id: { in: createdOrgIds.splice(0) } } });
  }
  if (createdUserIds.length) {
    await rootPrisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
}
