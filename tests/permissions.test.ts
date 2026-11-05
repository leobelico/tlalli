import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { can, leadScope } from "@/server/auth/permissions";
import {
  acceptInvitation,
  createInvitation,
  findValidInvitation,
  InvitationError,
  setMemberRole,
} from "@/server/auth/invitations";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg, makeUser } from "./helpers/factory";

describe("role matrix", () => {
  it("admins can do everything", () => {
    for (const p of ["org:settings", "members:manage", "units:write", "leads:viewAll"] as const) {
      expect(can("ADMIN", p)).toBe(true);
    }
  });

  it("asesores cannot manage org, members, inventory or campaigns", () => {
    for (const p of [
      "org:settings",
      "members:manage",
      "developments:write",
      "units:write",
      "campaigns:write",
      "leads:viewAll",
      "leads:assign",
      "leads:import",
      "leads:delete",
      "dashboard:viewAll",
    ] as const) {
      expect(can("ASESOR", p)).toBe(false);
    }
  });

  it("asesores can create leads and quotes", () => {
    expect(can("ASESOR", "leads:create")).toBe(true);
    expect(can("ASESOR", "quotes:create")).toBe(true);
  });

  it("asesores only see their own leads", () => {
    expect(leadScope({ orgId: "o", userId: "u1", role: "ASESOR" })).toEqual({ assignedToId: "u1" });
    expect(leadScope({ orgId: "o", userId: "u1", role: "ADMIN" })).toEqual({});
  });
});

describe("invitations", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  beforeAll(async () => {
    org = await makeOrg("Org Invitaciones");
  });
  afterAll(cleanup);

  it("asesor cannot invite", async () => {
    const { ctx } = await addMember(org.org.id, "ASESOR");
    await expect(createInvitation(ctx, { email: "x@ejemplo.test", role: "ASESOR" })).rejects.toThrow(
      /permiso/,
    );
  });

  it("admin invites; invitee with matching email joins with the given role", async () => {
    const invitee = await makeUser("Nuevo Asesor");
    const token = await createInvitation(org.adminCtx, { email: invitee.email.toUpperCase(), role: "ASESOR" });
    expect(await findValidInvitation(token)).not.toBeNull();

    const orgId = await acceptInvitation(token, { id: invitee.id, email: invitee.email });
    expect(orgId).toBe(org.org.id);
    const m = await rootPrisma.membership.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: org.org.id, userId: invitee.id } },
    });
    expect(m.role).toBe("ASESOR");
    // single use
    expect(await findValidInvitation(token)).toBeNull();
  });

  it("rejects acceptance by a different email", async () => {
    const token = await createInvitation(org.adminCtx, { email: "otra@ejemplo.test", role: "ASESOR" });
    const stranger = await makeUser("Extraño");
    await expect(acceptInvitation(token, { id: stranger.id, email: stranger.email })).rejects.toThrow(
      /otra@ejemplo.test/,
    );
  });

  it("rejects expired and unknown tokens", async () => {
    const token = await createInvitation(org.adminCtx, { email: "expira@ejemplo.test", role: "ASESOR" });
    await rootPrisma.invitation.updateMany({
      where: { email: "expira@ejemplo.test" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await findValidInvitation(token)).toBeNull();
    expect(await findValidInvitation("no-existe")).toBeNull();
  });

  it("enforces the plan seat limit", async () => {
    const small = await makeOrg("Org Chica");
    await rootPrisma.organization.update({ where: { id: small.org.id }, data: { plan: "BASICO" } });
    // BASICO = 3 seats; admin uses 1
    await createInvitation(small.adminCtx, { email: "a1@ejemplo.test", role: "ASESOR" });
    await createInvitation(small.adminCtx, { email: "a2@ejemplo.test", role: "ASESOR" });
    await expect(
      createInvitation(small.adminCtx, { email: "a3@ejemplo.test", role: "ASESOR" }),
    ).rejects.toBeInstanceOf(InvitationError);
  });

  it("an admin cannot demote themselves", async () => {
    const own = await rootPrisma.membership.findFirstOrThrow({
      where: { organizationId: org.org.id, userId: org.admin.id },
    });
    await expect(setMemberRole(org.adminCtx, own.id, "ASESOR")).rejects.toBeInstanceOf(InvitationError);
  });

  it("an admin of org A cannot change memberships of org B", async () => {
    const other = await makeOrg("Org Ajena");
    const { user } = await addMember(other.org.id, "ASESOR");
    const foreign = await rootPrisma.membership.findFirstOrThrow({
      where: { organizationId: other.org.id, userId: user.id },
    });
    await expect(setMemberRole(org.adminCtx, foreign.id, "ADMIN")).rejects.toThrow(/no encontrado/i);
    const after = await rootPrisma.membership.findUniqueOrThrow({ where: { id: foreign.id } });
    expect(after.role).toBe("ASESOR");
  });
});
