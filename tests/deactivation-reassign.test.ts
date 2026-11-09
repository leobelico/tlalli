import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deactivateMember, setMemberActive } from "@/server/auth/invitations";
import { reassignLeads } from "@/server/services/reassign";
import { createLeadManual } from "@/server/services/leads";
import { changeStage } from "@/server/services/pipeline";
import { createTask } from "@/server/services/tasks";
import { emailOutbox, resetOutbox } from "@/server/notify/email";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

describe("B17: deactivating an asesor hands over their leads", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let n = 0;
  const phone = () => `+52444950${String(++n).padStart(4, "0")}`;
  const membershipOf = async (userId: string) =>
    (await rootPrisma.membership.findFirstOrThrow({ where: { organizationId: org.org.id, userId } })).id;

  beforeAll(async () => {
    org = await makeOrg("Baja Org");
    other = await makeOrg("Baja Otra");
  });
  beforeEach(() => resetOutbox());
  afterAll(cleanup);

  it("requires an explicit decision: the old silent deactivation is gone", async () => {
    const leaving = await addMember(org.org.id, "ASESOR");
    await expect(setMemberActive(org.adminCtx, await membershipOf(leaving.user.id), false)).rejects.toThrow(/a quién/i);
  });

  it("moves open leads and pending tasks to the chosen asesor; closed sales keep their seller", async () => {
    const leaving = await addMember(org.org.id, "ASESOR");
    const heir = await addMember(org.org.id, "ASESOR");
    const open1 = (await createLeadManual(leaving.ctx, { firstName: "Abierto 1", phone: phone() })).lead;
    const open2 = (await createLeadManual(leaving.ctx, { firstName: "Abierto 2", phone: phone() })).lead;
    const lost = (await createLeadManual(leaving.ctx, { firstName: "Perdido", phone: phone() })).lead;
    await changeStage(leaving.ctx, lost.id, { stage: "PERDIDO", lostReason: "PRECIO" });
    await createTask(leaving.ctx, open1.id, { title: "Llamar", dueAt: new Date(Date.now() + 86_400_000) });

    const res = await deactivateMember(org.adminCtx, await membershipOf(leaving.user.id), { reassignTo: heir.user.id });
    expect(res).toMatchObject({ leads: 2, tasks: 1 });

    const leads = await rootPrisma.lead.findMany({ where: { id: { in: [open1.id, open2.id, lost.id] } } });
    const owner = Object.fromEntries(leads.map((l) => [l.firstName, l.assignedToId]));
    expect(owner["Abierto 1"]).toBe(heir.user.id);
    expect(owner["Abierto 2"]).toBe(heir.user.id);
    expect(owner["Perdido"]).toBe(leaving.user.id); // history / commission attribution stays
    expect((await rootPrisma.task.findFirstOrThrow({ where: { leadId: open1.id } })).assignedToId).toBe(heir.user.id);
    expect(await rootPrisma.activity.count({ where: { leadId: open1.id, type: "ASIGNACION" } })).toBe(1);
    const membership = await rootPrisma.membership.findFirstOrThrow({ where: { organizationId: org.org.id, userId: leaving.user.id } });
    expect(membership.active).toBe(false);
    // The heir gets one summary email, not one per lead.
    const heirEmail = (await rootPrisma.user.findUniqueOrThrow({ where: { id: heir.user.id } })).email;
    expect(emailOutbox.filter((m) => m.to === heirEmail)).toHaveLength(1);
  });

  it("can leave the leads unassigned (tasks go to the admin who did it)", async () => {
    const leaving = await addMember(org.org.id, "ASESOR");
    const lead = (await createLeadManual(leaving.ctx, { firstName: "Huérfano", phone: phone() })).lead;
    await createTask(leaving.ctx, lead.id, { title: "Visita", dueAt: new Date(Date.now() + 86_400_000) });
    await deactivateMember(org.adminCtx, await membershipOf(leaving.user.id), { reassignTo: null });
    expect((await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).assignedToId).toBeNull();
    expect((await rootPrisma.task.findFirstOrThrow({ where: { leadId: lead.id } })).assignedToId).toBe(org.admin.id);
  });

  it("refuses heirs that are inactive, from another organization, or the person leaving", async () => {
    const leaving = await addMember(org.org.id, "ASESOR");
    const mId = await membershipOf(leaving.user.id);
    const outsider = await addMember(other.org.id, "ASESOR");
    await expect(deactivateMember(org.adminCtx, mId, { reassignTo: outsider.user.id })).rejects.toThrow(/equipo/i);
    await expect(deactivateMember(org.adminCtx, mId, { reassignTo: leaving.user.id })).rejects.toThrow(/otra persona/i);
    const asesor = await addMember(org.org.id, "ASESOR");
    await expect(deactivateMember(asesor.ctx, mId, { reassignTo: null })).rejects.toThrow(/permiso/i);
  });
});

describe("B17: bulk reassignment from the leads list", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let a1: Awaited<ReturnType<typeof addMember>>;
  let a2: Awaited<ReturnType<typeof addMember>>;
  let n = 0;
  const phone = () => `+52444960${String(++n).padStart(4, "0")}`;

  beforeAll(async () => {
    org = await makeOrg("Masiva Org");
    a1 = await addMember(org.org.id, "ASESOR");
    a2 = await addMember(org.org.id, "ASESOR");
    for (let i = 0; i < 3; i++) await createLeadManual(a1.ctx, { firstName: `Nuevo ${i}`, phone: phone() });
    const c = (await createLeadManual(a1.ctx, { firstName: "Contactado", phone: phone() })).lead;
    await changeStage(a1.ctx, c.id, { stage: "CONTACTADO" });
  });
  afterAll(cleanup);

  it("moves exactly the leads matching the filters", async () => {
    const res = await reassignLeads(org.adminCtx, { assignedToId: a1.user.id, stage: "NUEVO" }, a2.user.id);
    expect(res.count).toBe(3);
    const byOwner = await rootPrisma.lead.groupBy({ by: ["assignedToId"], where: { organizationId: org.org.id }, _count: { _all: true } });
    const count = (id: string) => byOwner.find((g) => g.assignedToId === id)?._count._all ?? 0;
    expect(count(a2.user.id)).toBe(3);
    expect(count(a1.user.id)).toBe(1); // the CONTACTADO one did not match
  });

  it("only admins can do it, and the target must be an active member", async () => {
    await expect(reassignLeads(a1.ctx, {}, a2.user.id)).rejects.toThrow(/permiso/i);
    const outsider = await makeOrg("Masiva Otra");
    await expect(reassignLeads(org.adminCtx, {}, outsider.admin.id)).rejects.toThrow(/equipo/i);
  });
});
