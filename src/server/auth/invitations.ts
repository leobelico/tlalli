import "server-only";
import type { Role } from "@/generated/prisma/enums";
import { rootPrisma } from "@/server/db/root";
import { withOrg } from "@/server/db/tenant";
import { PLANS } from "@/lib/plans";
import { randomToken, sha256 } from "@/lib/tokens";
import { DomainError } from "@/server/errors";
import { sendEmail } from "@/server/notify/email";
import { invitationEmail } from "@/server/notify/templates";
import { assertCan, ForbiddenError, type Ctx } from "./permissions";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class InvitationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvitationError";
  }
}

/** Seats used = active members + pending (not expired) invitations. */
export async function seatUsage(ctx: Ctx) {
  return withOrg(ctx.orgId, async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId } });
    const [members, pending] = await Promise.all([
      tx.membership.count({ where: { active: true } }),
      tx.invitation.count({
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    return { used: members + pending, limit: PLANS[org.plan].seats, plan: org.plan };
  });
}

/** Creates an invitation and returns the raw token (only the hash is stored). */
export async function createInvitation(ctx: Ctx, input: { email: string; role: Role }) {
  assertCan(ctx, "members:manage");
  const email = input.email.trim().toLowerCase();
  const { used, limit } = await seatUsage(ctx);
  if (used >= limit) {
    throw new InvitationError(
      `Tu plan permite ${limit} usuarios y ya están ocupados. Cambia de plan o desactiva a alguien.`,
    );
  }
  const token = randomToken(32);
  const sender = await withOrg(ctx.orgId, async (tx) => {
    const alreadyMember = await tx.membership.findFirst({
      where: { active: true, user: { email } },
    });
    if (alreadyMember) throw new InvitationError("Esa persona ya es parte de tu equipo.");
    await tx.invitation.updateMany({
      where: { email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.invitation.create({
      data: {
        organizationId: ctx.orgId,
        email,
        role: input.role,
        tokenHash: sha256(token),
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });
    const [org, inviter] = await Promise.all([
      tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { name: true } }),
      tx.user.findUnique({ where: { id: ctx.userId }, select: { name: true } }),
    ]);
    return { orgName: org.name, inviterName: inviter?.name ?? "Tu administrador" };
  });
  // Best effort: the admin can still copy the link by hand if the email does not go out.
  await sendEmail({
    to: email,
    ...invitationEmail({ ...sender, role: input.role, link: `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/invitacion/${token}` }),
  });
  return token;
}

export async function revokeInvitation(ctx: Ctx, invitationId: string) {
  assertCan(ctx, "members:manage");
  await withOrg(ctx.orgId, (tx) =>
    tx.invitation.updateMany({
      where: { id: invitationId, acceptedAt: null },
      data: { revokedAt: new Date() },
    }),
  );
}

/** Public lookup by raw token (no tenant yet) — root client. */
export async function findValidInvitation(token: string) {
  if (!token || token.length > 200) return null;
  const inv = await rootPrisma.invitation.findUnique({
    where: { tokenHash: sha256(token) },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date()) return null;
  return inv;
}

export async function acceptInvitation(token: string, user: { id: string; email: string }) {
  const inv = await findValidInvitation(token);
  if (!inv) throw new InvitationError("La invitación no es válida o ya expiró.");
  if (inv.email !== user.email.toLowerCase()) {
    throw new ForbiddenError(`Esta invitación es para ${inv.email}. Inicia sesión con ese correo.`);
  }
  await rootPrisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { organizationId_userId: { organizationId: inv.organizationId, userId: user.id } },
      update: { active: true, role: inv.role },
      create: { organizationId: inv.organizationId, userId: user.id, role: inv.role },
    });
    await tx.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  });
  return inv.organizationId;
}

export async function setMemberActive(ctx: Ctx, membershipId: string, active: boolean) {
  assertCan(ctx, "members:manage");
  await withOrg(ctx.orgId, async (tx) => {
    const m = await tx.membership.findUnique({ where: { id: membershipId } });
    if (!m) throw new InvitationError("Miembro no encontrado.");
    if (m.userId === ctx.userId) throw new InvitationError("No puedes desactivarte a ti mismo.");
    if (active) {
      const { used, limit } = await seatUsage(ctx);
      if (used >= limit) throw new InvitationError("No hay lugares disponibles en tu plan.");
    }
    await tx.membership.update({ where: { id: membershipId }, data: { active } });
  });
}

export async function setMemberRole(ctx: Ctx, membershipId: string, role: Role) {
  assertCan(ctx, "members:manage");
  await withOrg(ctx.orgId, async (tx) => {
    const m = await tx.membership.findUnique({ where: { id: membershipId } });
    if (!m) throw new InvitationError("Miembro no encontrado.");
    if (m.userId === ctx.userId && role !== "ADMIN") {
      throw new InvitationError("No puedes quitarte el rol de administrador a ti mismo.");
    }
    await tx.membership.update({ where: { id: membershipId }, data: { role } });
  });
}
