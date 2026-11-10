import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reassignLeads, undoReassignment, UNDO_REASSIGN_WINDOW_MS } from "@/server/services/reassign";
import { createLeadManual, updateLead } from "@/server/services/leads";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

/** QA2 B37: reassigning a whole list can be undone for a few seconds. */
describe("undo of a bulk reassignment (QA2 B37)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let a1: Awaited<ReturnType<typeof addMember>>;
  let a2: Awaited<ReturnType<typeof addMember>>;
  let admin2: Awaited<ReturnType<typeof addMember>>;
  let n = 0;
  const phone = () => `+52444993${String(++n).padStart(4, "0")}`;
  const owner = async (id: string) => (await rootPrisma.lead.findUniqueOrThrow({ where: { id } })).assignedToId;
  const mk = async (assignTo: string | null, name = "Lead") => {
    const id = (await createLeadManual(org.adminCtx, { firstName: name, phone: phone(), assignedToId: assignTo ?? undefined })).lead.id;
    if (!assignTo) await rootPrisma.lead.update({ where: { id }, data: { assignedToId: null } }); // creating as admin auto-assigns; force 'sin asignar'
    return id;
  };

  beforeAll(async () => {
    org = await makeOrg("Masiva Org");
    other = await makeOrg("Masiva Otra");
    a1 = await addMember(org.org.id, "ASESOR");
    a2 = await addMember(org.org.id, "ASESOR");
    admin2 = await addMember(org.org.id, "ADMIN");
  });
  afterAll(cleanup);

  it("returns a batch id and restores every previous owner, including 'sin asignar'", async () => {
    const x = await mk(a1.user.id), y = await mk(null), z = await mk(a2.user.id);
    const res = await reassignLeads(org.adminCtx, {}, a2.user.id);
    expect(res.count).toBeGreaterThanOrEqual(2);
    expect(res.batchId).toMatch(/^[0-9a-f-]{36}$/);
    expect([await owner(x), await owner(y), await owner(z)]).toEqual([a2.user.id, a2.user.id, a2.user.id]);
    const back = await undoReassignment(org.adminCtx, res.batchId!);
    expect(back.restored).toBeGreaterThanOrEqual(2);
    expect(back.skipped).toBe(0);
    expect([await owner(x), await owner(y), await owner(z)]).toEqual([a1.user.id, null, a2.user.id]);
    expect(await rootPrisma.activity.count({ where: { leadId: x, body: { contains: "deshizo" } } })).toBe(1);
  });

  it("does not overwrite a lead somebody reassigned again in the meantime", async () => {
    const p = await mk(a1.user.id, "Cambia"), q = await mk(a1.user.id, "Sigue");
    const res = await reassignLeads(org.adminCtx, { q: "Cambia" }, a2.user.id);
    await reassignLeads(org.adminCtx, { q: "Sigue" }, a2.user.id); // a second batch must not interfere
    await updateLead(org.adminCtx, p, { firstName: "Cambia", phone: (await rootPrisma.lead.findUniqueOrThrow({ where: { id: p } })).phone, assignedToId: admin2.user.id });
    const back = await undoReassignment(org.adminCtx, res.batchId!);
    expect(back).toMatchObject({ restored: 0, skipped: 1 });
    expect(await owner(p)).toBe(admin2.user.id);
    expect(await owner(q)).toBe(a2.user.id);
  });

  it("only the person who did it, once, inside the window, within their organization", async () => {
    const l = await mk(a1.user.id, "Reglas");
    const res = await reassignLeads(org.adminCtx, { q: "Reglas" }, a2.user.id);
    await expect(undoReassignment(admin2.ctx, res.batchId!)).rejects.toThrow(/quien lo hizo/i);
    await expect(undoReassignment(other.adminCtx, res.batchId!)).rejects.toThrow(/no encontrad/i);
    await undoReassignment(org.adminCtx, res.batchId!);
    expect(await owner(l)).toBe(a1.user.id);
    await expect(undoReassignment(org.adminCtx, res.batchId!)).rejects.toThrow(/ya se deshizo/i);

    const l2 = await mk(a1.user.id, "Tarde");
    const late = await reassignLeads(org.adminCtx, { q: "Tarde" }, a2.user.id);
    await rootPrisma.reassignmentBatch.update({ where: { id: late.batchId! }, data: { createdAt: new Date(Date.now() - UNDO_REASSIGN_WINDOW_MS - 5_000) } });
    await expect(undoReassignment(org.adminCtx, late.batchId!)).rejects.toThrow(/tiempo/i);
    expect(await owner(l2)).toBe(a2.user.id);
  });

  it("a reassignment that moves nothing has nothing to undo", async () => {
    const res = await reassignLeads(org.adminCtx, { q: "no-existe-este-nombre" }, a2.user.id);
    expect(res).toMatchObject({ count: 0, batchId: null });
  });
});
