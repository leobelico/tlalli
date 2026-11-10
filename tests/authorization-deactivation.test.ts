import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationPendingError } from "@/server/errors";
import { createQuote } from "@/server/services/quotes";
import { createLeadManual, updateLead } from "@/server/services/leads";
import { createDevelopment, createUnit } from "@/server/services/inventory";
import { decideAuthorization, listAuthorizationRequests } from "@/server/services/authorizations";
import { deactivateMember } from "@/server/auth/invitations";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

/** QA2 B36: pending requests of a deactivated asesor must not stay in their name. */
describe("authorization requests when an asesor is deactivated (QA2 B36)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let devId: string;
  let n = 0;
  let c = 0;
  const phone = () => `+52444992${String(++n).padStart(4, "0")}`;
  const mkUnit = async () => (await createUnit(org.adminCtx, devId, { code: `B36-${++c}`, type: "LOTE", price: 500000, status: "DISPONIBLE" })).id;
  const membershipOf = (userId: string) => rootPrisma.membership.findFirstOrThrow({ where: { userId, organizationId: org.org.id } });
  /** The asesor asks for a big discount on a lead of theirs; returns the pending request. */
  async function pendingFor(asesor: Awaited<ReturnType<typeof addMember>>) {
    const unitId = await mkUnit();
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "Cliente B36", phone: phone() });
    const err = await createQuote(asesor.ctx, { unitId, leadId: lead.id, discount: 150000, downPaymentPct: 20, months: 12, annualRatePct: 10 }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthorizationPendingError);
    const req = await rootPrisma.authorizationRequest.findFirstOrThrow({ where: { unitId, status: "PENDIENTE" } });
    return { req, lead, unitId };
  }

  beforeAll(async () => {
    org = await makeOrg("Baja Solicitudes");
    other = await makeOrg("Baja Otra");
    devId = (await createDevelopment(org.adminCtx, { name: "Dev B36", city: "SLP" })).id;
  });
  afterAll(cleanup);

  it("with an heir, the pending requests move to the heir, and an approval is authored by the heir", async () => {
    const leaving = await addMember(org.org.id, "ASESOR");
    const heir = await addMember(org.org.id, "ASESOR");
    const { req, lead, unitId } = await pendingFor(leaving);
    const res = await deactivateMember(org.adminCtx, (await membershipOf(leaving.user.id)).id, { reassignTo: heir.user.id });
    expect(res).toMatchObject({ leads: 1 });
    expect((res as { requests?: number }).requests).toBe(1);
    const after = await rootPrisma.authorizationRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after).toMatchObject({ status: "PENDIENTE", requestedById: heir.user.id });
    expect((await listAuthorizationRequests(heir.ctx)).map((r) => r.id)).toContain(req.id);
    await decideAuthorization(org.adminCtx, req.id, { approve: true });
    const q = await rootPrisma.quote.findFirstOrThrow({ where: { unitId } });
    expect(q.createdById).toBe(heir.user.id);
    expect((await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).assignedToId).toBe(heir.user.id);
  });

  it("without an heir, the pending requests are cancelled with a visible reason and create nothing", async () => {
    const leaving = await addMember(org.org.id, "ASESOR");
    const { req, unitId } = await pendingFor(leaving);
    const res = await deactivateMember(org.adminCtx, (await membershipOf(leaving.user.id)).id, { reassignTo: null });
    expect((res as { requests?: number }).requests).toBe(1);
    const after = await rootPrisma.authorizationRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after.status).toBe("RECHAZADA");
    expect(after.decisionNote).toMatch(/baja/i);
    expect(after.decidedById).toBe(org.admin.id);
    expect(await rootPrisma.quote.count({ where: { unitId } })).toBe(0);
    await expect(decideAuthorization(org.adminCtx, req.id, { approve: true })).rejects.toThrow(/ya fue resuelta/i);
  });

  it("an old pending request of an inactive user, if approved, is authored by the lead's current owner", async () => {
    const gone = await addMember(org.org.id, "ASESOR");
    const owner = await addMember(org.org.id, "ASESOR");
    const { req, lead, unitId } = await pendingFor(gone);
    await updateLead(org.adminCtx, lead.id, { firstName: "Cliente B36", phone: lead.phone, assignedToId: owner.user.id });
    await rootPrisma.membership.updateMany({ where: { userId: gone.user.id, organizationId: org.org.id }, data: { active: false } });
    await decideAuthorization(org.adminCtx, req.id, { approve: true });
    expect((await rootPrisma.quote.findFirstOrThrow({ where: { unitId } })).createdById).toBe(owner.user.id);
  });

  it("if nobody active owns the lead, the approving administrator is the author", async () => {
    const gone = await addMember(org.org.id, "ASESOR");
    const { req, unitId } = await pendingFor(gone);
    await rootPrisma.membership.updateMany({ where: { userId: gone.user.id, organizationId: org.org.id }, data: { active: false } });
    await decideAuthorization(org.adminCtx, req.id, { approve: true });
    expect((await rootPrisma.quote.findFirstOrThrow({ where: { unitId } })).createdById).toBe(org.admin.id);
  });

  it("requests of other organizations are untouched", async () => {
    const mine = await addMember(org.org.id, "ASESOR");
    const theirs = await addMember(other.org.id, "ASESOR");
    const devOther = (await createDevelopment(other.adminCtx, { name: "Dev Otra", city: "SLP" })).id;
    const unitOther = (await createUnit(other.adminCtx, devOther, { code: "O-1", type: "LOTE", price: 500000, status: "DISPONIBLE" })).id;
    await createQuote(theirs.ctx, { unitId: unitOther, discount: 150000, downPaymentPct: 20, months: 12, annualRatePct: 10 }).catch(() => {});
    await pendingFor(mine);
    await deactivateMember(org.adminCtx, (await membershipOf(mine.user.id)).id, { reassignTo: null });
    expect(await rootPrisma.authorizationRequest.count({ where: { organizationId: other.org.id, status: "PENDIENTE" } })).toBe(1);
  });
});
