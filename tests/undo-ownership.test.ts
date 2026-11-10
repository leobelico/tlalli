import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { changeStage, changeStageDetailed, undoStageChange } from "@/server/services/pipeline";
import { createLeadManual, updateLead } from "@/server/services/leads";
import { createDevelopment, createUnit, setUnitStatus } from "@/server/services/inventory";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

/** QA2 B31 / B35: undo must look at WHO holds a unit, and a lost race must say so in plain Spanish. */
describe("undo and unit ownership (QA2 B31, B35)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let a1: Awaited<ReturnType<typeof addMember>>;
  let a2: Awaited<ReturnType<typeof addMember>>;
  let devId: string;
  let n = 0;
  let codeN = 0;
  let mine: string[] = [];
  beforeEach(() => { mine = []; });
  const phone = () => `+52444991${String(++n).padStart(4, "0")}`;
  const unit = (id: string) => rootPrisma.unit.findUniqueOrThrow({ where: { id } });
  const lead = (id: string) => rootPrisma.lead.findUniqueOrThrow({ where: { id } });
  const mkUnit = async () => {
    const id = (await createUnit(org.adminCtx, devId, { code: `X-${++codeN}`, type: "LOTE", price: 400000, status: "DISPONIBLE" })).id;
    mine.push(id);
    return id;
  };
  const mkLead = async (ctx: typeof a1.ctx, unitId?: string, name = "Cliente") => (await createLeadManual(ctx, { firstName: name, phone: phone(), unitId })).lead;
  /** Every unit's status must match the leads that hold it. */
  const incoherent = async () =>
    rootPrisma.$queryRaw<{ code: string; status: string }[]>`
      SELECT u.code, u.status::text FROM units u
      LEFT JOIN leads l ON l.unit_id = u.id AND l.stage IN ('APARTADO','VENDIDO')
      WHERE u.id = ANY(${mine}::uuid[])
      GROUP BY u.id, u.code, u.status
      HAVING (u.status = 'APARTADO' AND count(*) FILTER (WHERE l.stage = 'APARTADO') <> 1)
          OR (u.status = 'VENDIDO' AND count(*) FILTER (WHERE l.stage = 'VENDIDO') <> 1)
          OR (u.status = 'DISPONIBLE' AND count(l.id) > 0)`;

  beforeAll(async () => {
    org = await makeOrg("Dueño Lote Org");
    a1 = await addMember(org.org.id, "ASESOR");
    a2 = await addMember(org.org.id, "ASESOR");
    devId = (await createDevelopment(org.adminCtx, { name: "Dev Dueño", city: "SLP" })).id;
  });
  afterAll(cleanup);

  it("does not release a lot another client took after the first lead moved to a different unit", async () => {
    const u1 = await mkUnit();
    const u2 = await mkUnit();
    const l1 = await mkLead(a1.ctx, u1, "Primero");
    const l2 = await mkLead(a2.ctx, u1, "Segundo");
    const ap = await changeStageDetailed(a1.ctx, l1.id, { stage: "APARTADO" });
    // the first lead is moved to another lot while still apartado (releases u1, holds u2)
    await updateLead(org.adminCtx, l1.id, { firstName: "Primero", phone: l1.phone, unitId: u2, assignedToId: a1.user.id });
    expect((await unit(u1)).status).toBe("DISPONIBLE");
    expect((await unit(u2)).status).toBe("APARTADO");
    // someone else takes u1
    await changeStage(a2.ctx, l2.id, { stage: "APARTADO" });
    expect((await unit(u1)).status).toBe("APARTADO");
    // the first asesor presses Deshacer
    await undoStageChange(a1.ctx, ap.eventId!);
    expect((await lead(l1.id)).stage).toBe("NUEVO");
    expect((await unit(u1)).status).toBe("APARTADO"); // still the second client's
    expect((await lead(l2.id)).stage).toBe("APARTADO");
    expect((await unit(u2)).status).toBe("DISPONIBLE"); // the lot l1 had moved to is freed
    expect(await incoherent()).toEqual([]);
  });

  it("undoing a sale gives back the apartado and keeps the lot with its holder", async () => {
    const u = await mkUnit();
    const l = await mkLead(org.adminCtx, u, "Vendido");
    await changeStage(org.adminCtx, l.id, { stage: "APARTADO" });
    const sale = await changeStageDetailed(org.adminCtx, l.id, { stage: "VENDIDO", saleAmount: 390000 });
    await undoStageChange(org.adminCtx, sale.eventId!);
    expect((await lead(l.id)).stage).toBe("APARTADO");
    expect((await unit(u)).status).toBe("APARTADO");
    expect(await incoherent()).toEqual([]);
  });

  it("undoing a direct sale frees the lot; an off-system status is not overwritten", async () => {
    const u = await mkUnit();
    const l = await mkLead(org.adminCtx, u, "Venta directa");
    const sale = await changeStageDetailed(org.adminCtx, l.id, { stage: "VENDIDO", saleAmount: 400000 });
    expect((await unit(u)).status).toBe("VENDIDO");
    await undoStageChange(org.adminCtx, sale.eventId!);
    expect((await unit(u)).status).toBe("DISPONIBLE");
    expect(await incoherent()).toEqual([]);
  });

  it("after the lot is released by hand it cannot be undone into a double booking", async () => {
    const u = await mkUnit();
    const l1 = await mkLead(a1.ctx, u, "Liberado a mano");
    const ap = await changeStageDetailed(a1.ctx, l1.id, { stage: "APARTADO" });
    // freeing it by hand is refused while a client holds it
    await expect(setUnitStatus(org.adminCtx, u, "DISPONIBLE")).rejects.toThrow(/apartad/i);
    // the admin releases it the right way: the holder leaves "Apartado"
    await changeStage(org.adminCtx, l1.id, { stage: "COTIZACION" });
    expect((await unit(u)).status).toBe("DISPONIBLE");
    const l2 = await mkLead(a2.ctx, u, "Otro");
    await changeStage(a2.ctx, l2.id, { stage: "APARTADO" });
    // the first asesor's Deshacer is now stale and must not touch anything
    await expect(undoStageChange(a1.ctx, ap.eventId!)).rejects.toThrow(/otro cambio/i);
    expect((await unit(u)).status).toBe("APARTADO");
    expect((await lead(l2.id)).stage).toBe("APARTADO");
    expect(await incoherent()).toEqual([]);
  });

  it("refuses to undo a lost deal back into a lot somebody else holds now", async () => {
    const u = await mkUnit();
    const l1 = await mkLead(a1.ctx, u, "Perdió el lote");
    await changeStage(a1.ctx, l1.id, { stage: "APARTADO" });
    const lost = await changeStageDetailed(a1.ctx, l1.id, { stage: "PERDIDO", lostReason: "PRECIO" });
    const l2 = await mkLead(a2.ctx, u, "Lo tomó");
    await changeStage(a2.ctx, l2.id, { stage: "APARTADO" });
    await expect(undoStageChange(a1.ctx, lost.eventId!)).rejects.toThrow(/ya fue apartada por otro cliente/i);
    expect((await lead(l1.id)).stage).toBe("PERDIDO");
    expect((await unit(u)).status).toBe("APARTADO");
    expect((await rootPrisma.leadStageEvent.findUniqueOrThrow({ where: { id: lost.eventId! } })).undoneAt).toBeNull();
    expect(await incoherent()).toEqual([]);
  });

  it("two asesores booking the same lot at once: one wins, the other gets the plain message (B35)", async () => {
    for (let round = 0; round < 12; round++) {
      const u = await mkUnit();
      const l1 = await mkLead(a1.ctx, u, `Carrera A${round}`);
      const l2 = await mkLead(a2.ctx, u, `Carrera B${round}`);
      const results = await Promise.allSettled([
        changeStage(a1.ctx, l1.id, { stage: "APARTADO" }),
        changeStage(a2.ctx, l2.id, { stage: "APARTADO" }),
      ]);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(failed).toHaveLength(1);
      expect(String(failed[0].reason?.message)).toMatch(/ya fue apartada por otro cliente/i);
      expect((await unit(u)).status).toBe("APARTADO");
    }
    expect(await incoherent()).toEqual([]);
  });

  it("undo and a competing booking at the same moment never leave the lot incoherent", async () => {
    for (let round = 0; round < 10; round++) {
      const u = await mkUnit();
      const l1 = await mkLead(a1.ctx, u, `Undo A${round}`);
      const l2 = await mkLead(a2.ctx, u, `Undo B${round}`);
      const ap = await changeStageDetailed(a1.ctx, l1.id, { stage: "APARTADO" });
      await Promise.allSettled([undoStageChange(a1.ctx, ap.eventId!), changeStage(a2.ctx, l2.id, { stage: "APARTADO" })]);
      expect(await incoherent()).toEqual([]);
      const holders = await rootPrisma.lead.count({ where: { unitId: u, stage: { in: ["APARTADO", "VENDIDO"] } } });
      expect(holders).toBeLessThanOrEqual(1);
    }
  });

  it("moving an apartado onto a lot another client took at the same time says so (B35, lead edit path)", async () => {
    const target = await mkUnit();
    const own = await mkUnit();
    const holder = await mkLead(a2.ctx, target, "Dueño del destino");
    await changeStage(a2.ctx, holder.id, { stage: "APARTADO" });
    const mover = await mkLead(a1.ctx, own, "Mueve");
    await changeStage(a1.ctx, mover.id, { stage: "APARTADO" });
    await expect(updateLead(org.adminCtx, mover.id, { firstName: "Mueve", phone: mover.phone, unitId: target, assignedToId: a1.user.id })).rejects.toThrow(/ya (fue|está) apartada/i);
    expect((await unit(own)).status).toBe("APARTADO");
  });
});
